import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { resolveConfigDir } from 'src/appConfig/appConfig.helper';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import {
	DEFAULT_TRACKED_TOKENS,
	PriceProviderEnum,
	TrackedToken,
} from './tokenPrice.config';

/** Looked up in the same folders as the other appConfig JSON files. */
export const TRACKED_TOKENS_FILE_NAME = 'trackedTokens.json';

const KNOWN_PROVIDERS = Object.values(PriceProviderEnum) as string[];

const symbolList = (tokens: readonly TrackedToken[]): string =>
	tokens.map((token) => token.symbol).join(', ') || '<none>';

/**
 * Validates the raw file contents. Accepts either a bare array or
 * `{ "tokens": [...] }`. Throws when the file is unusable so the caller can
 * keep serving the previously loaded list.
 */
export const parseTrackedTokens = (raw: unknown): TrackedToken[] => {
	const entries = Array.isArray(raw)
		? raw
		: (raw as { tokens?: unknown })?.tokens ?? undefined;

	if (!Array.isArray(entries)) {
		throw new Error(
			'expected an array of tokens, or an object with a "tokens" array',
		);
	}

	const tokens: TrackedToken[] = [];
	const seenSymbols = new Set<string>();
	const seenTokenIDs = new Map<number, string>();

	for (const [index, entry] of entries.entries()) {
		const at = `entry #${index}`;
		if (typeof entry !== 'object' || entry === null) {
			throw new Error(`${at}: expected an object`);
		}

		const { symbol, aliases, tokenIDs, ids } = entry as Record<string, unknown>;

		if (typeof symbol !== 'string' || !symbol.trim()) {
			throw new Error(`${at}: "symbol" must be a non-empty string`);
		}
		const normalizedSymbol = symbol.trim().toUpperCase();

		if (seenSymbols.has(normalizedSymbol)) {
			throw new Error(`${at}: duplicate symbol "${normalizedSymbol}"`);
		}

		if (aliases !== undefined && !Array.isArray(aliases)) {
			throw new Error(
				`${at} (${normalizedSymbol}): "aliases" must be an array`,
			);
		}
		const normalizedAliases = ((aliases ?? []) as unknown[]).map((alias) => {
			if (typeof alias !== 'string' || !alias.trim()) {
				throw new Error(
					`${at} (${normalizedSymbol}): "aliases" must contain non-empty strings`,
				);
			}
			return alias.trim();
		});

		if (tokenIDs !== undefined && !Array.isArray(tokenIDs)) {
			throw new Error(
				`${at} (${normalizedSymbol}): "tokenIDs" must be an array`,
			);
		}
		const normalizedTokenIDs = ((tokenIDs ?? []) as unknown[]).map(
			(tokenID) => {
				if (typeof tokenID !== 'number' || !Number.isInteger(tokenID)) {
					throw new Error(
						`${at} (${normalizedSymbol}): "tokenIDs" must contain integers`,
					);
				}
				return tokenID;
			},
		);

		if (typeof ids !== 'object' || ids === null || Array.isArray(ids)) {
			throw new Error(
				`${at} (${normalizedSymbol}): "ids" must be an object keyed by provider`,
			);
		}

		const normalizedIds: Partial<Record<PriceProviderEnum, string>> = {};
		for (const [provider, id] of Object.entries(ids)) {
			if (!KNOWN_PROVIDERS.includes(provider)) {
				// tolerated so a config can be prepared ahead of a provider release
				Logger.warn(
					`Tracked tokens: unknown price provider "${provider}" for ${normalizedSymbol}, ignoring it. Known providers: ${KNOWN_PROVIDERS.join(', ')}`,
				);
				continue;
			}
			if (typeof id !== 'string' || !id.trim()) {
				throw new Error(
					`${at} (${normalizedSymbol}): id for "${provider}" must be a non-empty string`,
				);
			}
			normalizedIds[provider as PriceProviderEnum] = id.trim();
		}

		if (Object.keys(normalizedIds).length === 0) {
			throw new Error(
				`${at} (${normalizedSymbol}): needs at least one known provider id`,
			);
		}

		for (const tokenID of normalizedTokenIDs) {
			const owner = seenTokenIDs.get(tokenID);
			if (owner) {
				throw new Error(
					`${at} (${normalizedSymbol}): tokenID ${tokenID} is already mapped to ${owner}`,
				);
			}
			seenTokenIDs.set(tokenID, normalizedSymbol);
		}

		seenSymbols.add(normalizedSymbol);
		tokens.push({
			symbol: normalizedSymbol,
			aliases: normalizedAliases,
			tokenIDs: normalizedTokenIDs,
			ids: normalizedIds,
		});
	}

	return tokens;
};

/**
 * Source of truth for the tokens whose price is fetched.
 *
 * The list lives in a JSON file outside the compiled code (see
 * TRACKED_TOKENS_FILE_NAME, path overridable with TRACKED_TOKENS_PATH), and is
 * re-read whenever the file changes on disk. Adding a token is therefore an
 * edit of a mounted file - no rebuild, no redeploy, no restart; the change is
 * picked up on the next price refresh.
 *
 * DEFAULT_TRACKED_TOKENS is used when the file is missing, and the last good
 * list is kept when the file is present but invalid.
 */
@Injectable()
export class TrackedTokensRegistry {
	private tokens: readonly TrackedToken[] = DEFAULT_TRACKED_TOKENS;
	private filePath?: string;
	private filePathResolved = false;
	private loadedMtimeMs?: number;
	private missingFileLogged = false;

	constructor(private readonly appConfig: AppConfigService) {}

	/**
	 * The current list. Reloads first when the file changed, so callers always
	 * see the latest config without holding on to a stale copy.
	 */
	getTokens(): readonly TrackedToken[] {
		this.reloadIfChanged();
		return this.tokens;
	}

	private reloadIfChanged(): void {
		const filePath = this.resolveFilePath();
		if (!filePath) {
			return;
		}

		let mtimeMs: number;
		try {
			mtimeMs = fs.statSync(filePath).mtimeMs;
		} catch {
			if (!this.missingFileLogged) {
				Logger.warn(
					`Tracked tokens file not found at ${filePath}, falling back to the built-in list: ${symbolList(this.tokens)}`,
				);
				this.missingFileLogged = true;
			}
			return;
		}

		this.missingFileLogged = false;
		if (this.loadedMtimeMs === mtimeMs) {
			return;
		}

		// remembered even on failure, so a broken file is not re-parsed (and
		// re-logged) on every tick - only once per change
		this.loadedMtimeMs = mtimeMs;

		try {
			const parsed = parseTrackedTokens(
				JSON.parse(fs.readFileSync(filePath, 'utf8')),
			);
			this.tokens = parsed;
			Logger.log(
				`Tracked tokens loaded from ${filePath}: ${symbolList(parsed)}`,
			);
		} catch (error) {
			Logger.error(
				`Invalid tracked tokens file ${filePath}: ${error instanceof Error ? error.message : error}. Keeping the current list: ${symbolList(this.tokens)}`,
			);
		}
	}

	/** Resolved once - the folder does not move while the process is running. */
	private resolveFilePath(): string | undefined {
		if (this.filePathResolved) {
			return this.filePath;
		}
		this.filePathResolved = true;

		const configured = this.appConfig.prices.trackedTokensPath?.trim();
		if (configured) {
			this.filePath = path.resolve(configured);
			return this.filePath;
		}

		const dir = resolveConfigDir(TRACKED_TOKENS_FILE_NAME);
		this.filePath = dir ? path.join(dir, TRACKED_TOKENS_FILE_NAME) : undefined;
		if (!this.filePath) {
			Logger.warn(
				`No ${TRACKED_TOKENS_FILE_NAME} found and TRACKED_TOKENS_PATH is not set, using the built-in list: ${symbolList(this.tokens)}`,
			);
		}
		return this.filePath;
	}
}

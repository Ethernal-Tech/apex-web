import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { resolveConfigDir } from 'src/appConfig/appConfig.helper';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import {
	DEFAULT_TOKEN_INFOS,
	TokenInfo,
	TokenInfosConfig,
	TokenNetworkEnum,
} from './tokenInfo.config';

/**
 * One file per network, looked up in the same folders as the other appConfig
 * JSON files. Each deployment only carries the file of the network it serves.
 */
export const tokenInfosFileName = (network: TokenNetworkEnum): string =>
	`tokenInfos.${network}.json`;

const summary = (config: TokenInfosConfig): string =>
	`${config.tokens.length} token(s)`;

const parseTokenInfo = (raw: unknown, at: string): TokenInfo => {
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		throw new Error(`${at}: expected an object`);
	}

	const { tokenID, label, icon, iconUrl } = raw as Record<string, unknown>;

	if (typeof tokenID !== 'number' || !Number.isInteger(tokenID)) {
		throw new Error(`${at}: "tokenID" must be an integer`);
	}
	// empty label is allowed - the unknown token has none
	if (typeof label !== 'string') {
		throw new Error(`${at} (tokenID ${tokenID}): "label" must be a string`);
	}
	if (typeof icon !== 'string' || !icon.trim()) {
		throw new Error(
			`${at} (tokenID ${tokenID}): "icon" must be a non-empty string`,
		);
	}
	if (
		iconUrl !== undefined &&
		(typeof iconUrl !== 'string' || !iconUrl.trim())
	) {
		throw new Error(
			`${at} (tokenID ${tokenID}): "iconUrl" must be a non-empty string when set`,
		);
	}
	return {
		tokenID,
		label: label.trim(),
		icon: icon.trim(),
		...(iconUrl ? { iconUrl: iconUrl.trim() } : {}),
	};
};

/**
 * Validates the raw file contents. Accepts either a bare array or
 * `{ "tokens": [...] }` with an optional "unknownToken". Throws when the file
 * is unusable so the caller can keep serving the previously loaded config.
 */
export const parseTokenInfos = (raw: unknown): TokenInfosConfig => {
	const entries = Array.isArray(raw)
		? raw
		: (raw as { tokens?: unknown })?.tokens ?? undefined;

	if (!Array.isArray(entries)) {
		throw new Error(
			'expected an array of tokens, or an object with a "tokens" array',
		);
	}

	const unknownToken = Array.isArray(raw)
		? undefined
		: (raw as { unknownToken?: unknown }).unknownToken;

	const tokens: TokenInfo[] = [];
	const seen = new Set<number>();

	for (const [index, entry] of entries.entries()) {
		const token = parseTokenInfo(entry, `entry #${index}`);
		if (seen.has(token.tokenID)) {
			throw new Error(`entry #${index}: duplicate tokenID ${token.tokenID}`);
		}
		seen.add(token.tokenID);
		tokens.push(token);
	}

	return {
		unknownToken:
			unknownToken === undefined
				? DEFAULT_TOKEN_INFOS.unknownToken
				: parseTokenInfo(unknownToken, 'unknownToken'),
		tokens,
	};
};

/**
 * Source of truth for the token display metadata (label, icon).
 *
 * The data lives in a JSON file next to the other appConfig JSON files -
 * tokenInfos.<network>.json, the network coming from app.isMainnet. It is
 * re-read whenever the file changes on disk, so adding a token is an edit of
 * that file - no rebuild, no redeploy, no restart.
 *
 * DEFAULT_TOKEN_INFOS is used when the file is missing, and the last good
 * config is kept when the file is present but invalid.
 */
@Injectable()
export class TokenInfosRegistry {
	private config: TokenInfosConfig = DEFAULT_TOKEN_INFOS;
	private filePath?: string;
	private filePathResolved = false;
	private loadedMtimeMs?: number;
	private missingFileLogged = false;

	constructor(private readonly appConfig: AppConfigService) {}

	/** Network this instance serves. */
	get network(): TokenNetworkEnum {
		return this.appConfig.app.isMainnet
			? TokenNetworkEnum.Mainnet
			: TokenNetworkEnum.Testnet;
	}

	/**
	 * The current metadata. Reloads first when the file changed, so callers
	 * always see the latest config without holding on to a stale copy.
	 */
	getTokens(): readonly TokenInfo[] {
		this.reloadIfChanged();
		return this.config.tokens;
	}

	/** Metadata served for a token ID that is not in the list. */
	getUnknownToken(): TokenInfo {
		this.reloadIfChanged();
		return this.config.unknownToken;
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
					`Token infos file not found at ${filePath}, serving the built-in config: ${summary(this.config)}`,
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
		// re-logged) on every request - only once per change
		this.loadedMtimeMs = mtimeMs;

		try {
			const parsed = parseTokenInfos(
				JSON.parse(fs.readFileSync(filePath, 'utf8')),
			);
			this.config = parsed;
			Logger.log(`Token infos loaded from ${filePath}: ${summary(parsed)}`);
		} catch (error) {
			Logger.error(
				`Invalid token infos file ${filePath}: ${error instanceof Error ? error.message : error}. Keeping the current config: ${summary(this.config)}`,
			);
		}
	}

	/** Resolved once - the folder does not move while the process is running. */
	private resolveFilePath(): string | undefined {
		if (this.filePathResolved) {
			return this.filePath;
		}
		this.filePathResolved = true;

		const fileName = tokenInfosFileName(this.network);
		const dir = resolveConfigDir(fileName);
		this.filePath = dir ? path.join(dir, fileName) : undefined;
		if (!this.filePath) {
			Logger.warn(
				`No ${fileName} found, serving the built-in config: ${summary(this.config)}`,
			);
		}
		return this.filePath;
	}
}

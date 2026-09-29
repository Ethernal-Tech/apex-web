import { Injectable } from '@nestjs/common';
import {
	ConfigNetworkEnum,
	configNetworkOf,
} from 'src/appConfig/configNetwork';
import { JsonConfigFile } from 'src/appConfig/jsonConfigFile';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { asHexColor } from 'src/utils/colorUtils';
import {
	DEFAULT_TOKEN_INFOS,
	TokenInfo,
	TokenInfosConfig,
} from './tokenInfo.config';

/**
 * One file per network, looked up in the same folders as the other appConfig
 * JSON files. Each deployment only carries the file of the network it serves.
 */
export const tokenInfosFileName = (network: ConfigNetworkEnum): string =>
	`tokenInfos.${network}.json`;

const summary = (config: TokenInfosConfig): string =>
	`${config.tokens.length} token(s)`;

const parseTokenInfo = (raw: unknown, at: string): TokenInfo => {
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		throw new Error(`${at}: expected an object`);
	}

	const { tokenID, label, icon, iconUrl, color } = raw as Record<
		string,
		unknown
	>;

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
	const parsedColor = color === undefined ? undefined : asHexColor(color);
	if (color !== undefined && parsedColor === undefined) {
		throw new Error(
			`${at} (tokenID ${tokenID}): "color" must be a hex color like #3B92FF when set`,
		);
	}
	return {
		tokenID,
		label: label.trim(),
		icon: icon.trim(),
		...(iconUrl ? { iconUrl: iconUrl.trim() } : {}),
		...(parsedColor ? { color: parsedColor } : {}),
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
 * Source of truth for the token display metadata (label, icon, color).
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
	private readonly file: JsonConfigFile<TokenInfosConfig>;

	constructor(private readonly appConfig: AppConfigService) {
		this.file = new JsonConfigFile({
			fileName: tokenInfosFileName(this.network),
			label: 'Token infos',
			parse: parseTokenInfos,
			summary,
			fallback: DEFAULT_TOKEN_INFOS,
		});
	}

	/** Network this instance serves. */
	get network(): ConfigNetworkEnum {
		return configNetworkOf(this.appConfig.app.isMainnet);
	}

	/** The current metadata, reloaded when the file changed. */
	getTokens(): readonly TokenInfo[] {
		return this.file.get().tokens;
	}

	/** Metadata served for a token ID that is not in the list. */
	getUnknownToken(): TokenInfo {
		return this.file.get().unknownToken;
	}
}

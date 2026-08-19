import { Injectable } from '@nestjs/common';
import {
	ConfigNetworkEnum,
	configNetworkOf,
} from 'src/appConfig/configNetwork';
import { JsonConfigFile } from 'src/appConfig/jsonConfigFile';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { asHexColor } from 'src/utils/colorUtils';
import {
	CHAIN_CATEGORIES,
	ChainCategory,
	ChainInfo,
	ChainInfosConfig,
	DEFAULT_CHAIN_INFOS,
} from './chainInfo.config';

/**
 * One file per network, looked up in the same folders as the other appConfig
 * JSON files. Each deployment only carries the file of the network it serves.
 */
export const chainInfosFileName = (network: ConfigNetworkEnum): string =>
	`chainInfos.${network}.json`;

const summary = (config: ChainInfosConfig): string =>
	`${config.chains.length} chain(s)`;

/**
 * A trimmed non-empty string, or undefined when the field is absent. Throws for
 * a value of the wrong type, so a typo is caught at load rather than reaching
 * the UI as a blank label.
 */
const optionalText = (
	raw: unknown,
	at: string,
	field: string,
): string | undefined => {
	if (raw === undefined || raw === null) {
		return undefined;
	}
	if (typeof raw !== 'string') {
		throw new Error(`${at}: "${field}" must be a string`);
	}
	const text = raw.trim();

	return text === '' ? undefined : text;
};

const optionalOrder = (raw: unknown, at: string): number | undefined => {
	if (raw === undefined || raw === null) {
		return undefined;
	}
	if (typeof raw !== 'number' || !Number.isFinite(raw)) {
		throw new Error(`${at}: "order" must be a number`);
	}

	return raw;
};

const optionalCategory = (
	raw: unknown,
	at: string,
): ChainCategory | undefined => {
	if (raw === undefined || raw === null) {
		return undefined;
	}
	if (typeof raw !== 'string') {
		throw new Error(`${at}: "category" must be a string`);
	}
	const category = raw.trim().toLowerCase();
	if (!(CHAIN_CATEGORIES as readonly string[]).includes(category)) {
		throw new Error(
			`${at}: "category" must be one of ${CHAIN_CATEGORIES.join(', ')}`,
		);
	}

	return category as ChainCategory;
};

const optionalFlag = (
	raw: unknown,
	at: string,
	field: string,
): boolean | undefined => {
	if (raw === undefined || raw === null) {
		return undefined;
	}
	if (typeof raw !== 'boolean') {
		throw new Error(`${at}: "${field}" must be true or false`);
	}

	return raw;
};

/**
 * Chain ids are lowercase everywhere else in the API, so the file is read that
 * way too - `Prime` in the config still colors `prime`.
 *
 * Only "chain" and "color" are required. Every display field is optional and
 * omitted from the result when unset, so the UI applies its own fallback rather
 * than rendering an empty label or a missing logo.
 */
const parseChainInfo = (raw: unknown, at: string): ChainInfo => {
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		throw new Error(`${at}: expected an object`);
	}

	const {
		chain,
		color,
		label,
		icon,
		iconUrl,
		order,
		category,
		symbol,
		apexFusion,
	} = raw as Record<string, unknown>;

	// the unknown chain entry stands for every chain, so it names none
	if (typeof chain !== 'string') {
		throw new Error(`${at}: "chain" must be a string`);
	}
	const parsedColor = asHexColor(color);
	if (parsedColor === undefined) {
		throw new Error(
			`${at} (chain ${chain}): "color" must be a hex color like #3B92FF`,
		);
	}

	const where = chain ? `${at} (chain ${chain})` : at;
	const parsedLabel = optionalText(label, where, 'label');
	const parsedIcon = optionalText(icon, where, 'icon');
	const parsedIconUrl = optionalText(iconUrl, where, 'iconUrl');
	const parsedOrder = optionalOrder(order, where);
	const parsedCategory = optionalCategory(category, where);
	const parsedSymbol = optionalText(symbol, where, 'symbol');
	const parsedApexFusion = optionalFlag(apexFusion, where, 'apexFusion');

	return {
		chain: chain.trim().toLowerCase(),
		color: parsedColor,
		...(parsedLabel === undefined ? {} : { label: parsedLabel }),
		...(parsedIcon === undefined ? {} : { icon: parsedIcon }),
		...(parsedIconUrl === undefined ? {} : { iconUrl: parsedIconUrl }),
		...(parsedOrder === undefined ? {} : { order: parsedOrder }),
		...(parsedCategory === undefined ? {} : { category: parsedCategory }),
		...(parsedSymbol === undefined ? {} : { symbol: parsedSymbol }),
		...(parsedApexFusion === undefined ? {} : { apexFusion: parsedApexFusion }),
	};
};

/**
 * Validates the raw file contents. Accepts either a bare array or
 * `{ "chains": [...] }` with an optional "unknownChain". Throws when the file
 * is unusable so the caller can keep serving the previously loaded config.
 */
export const parseChainInfos = (raw: unknown): ChainInfosConfig => {
	const entries = Array.isArray(raw)
		? raw
		: (raw as { chains?: unknown })?.chains ?? undefined;

	if (!Array.isArray(entries)) {
		throw new Error(
			'expected an array of chains, or an object with a "chains" array',
		);
	}

	const unknownChain = Array.isArray(raw)
		? undefined
		: (raw as { unknownChain?: unknown }).unknownChain;

	const chains: ChainInfo[] = [];
	const seen = new Set<string>();

	for (const [index, entry] of entries.entries()) {
		const info = parseChainInfo(entry, `entry #${index}`);
		if (!info.chain) {
			throw new Error(`entry #${index}: "chain" must not be empty`);
		}
		if (seen.has(info.chain)) {
			throw new Error(`entry #${index}: duplicate chain ${info.chain}`);
		}
		seen.add(info.chain);
		chains.push(info);
	}

	return {
		...(unknownChain === undefined
			? {}
			: { unknownChain: parseChainInfo(unknownChain, 'unknownChain') }),
		chains,
	};
};

/**
 * Source of truth for the chain display metadata - color, label, logo, order,
 * family, symbol.
 *
 * The data lives in a JSON file next to the other appConfig JSON files -
 * chainInfos.<network>.json, the network coming from app.isMainnet. It is
 * re-read whenever the file changes on disk, so recoloring, renaming or
 * relogo-ing a chain is an edit of that file - no rebuild, no redeploy, no
 * restart.
 *
 * DEFAULT_CHAIN_INFOS is used when the file is missing, and the last good
 * config is kept when the file is present but invalid.
 */
@Injectable()
export class ChainInfosRegistry {
	private readonly file: JsonConfigFile<ChainInfosConfig>;

	constructor(private readonly appConfig: AppConfigService) {
		this.file = new JsonConfigFile({
			fileName: chainInfosFileName(this.network),
			label: 'Chain infos',
			parse: parseChainInfos,
			summary,
			fallback: DEFAULT_CHAIN_INFOS,
		});
	}

	/** Network this instance serves. */
	get network(): ConfigNetworkEnum {
		return configNetworkOf(this.appConfig.app.isMainnet);
	}

	/** The current metadata, reloaded when the file changed. */
	getChains(): readonly ChainInfo[] {
		return this.file.get().chains;
	}

	/** Metadata served for a chain that is not in the list, when the file sets one. */
	getUnknownChain(): ChainInfo | undefined {
		return this.file.get().unknownChain;
	}
}

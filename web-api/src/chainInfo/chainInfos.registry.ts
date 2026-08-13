import { Injectable } from '@nestjs/common';
import {
	ConfigNetworkEnum,
	configNetworkOf,
} from 'src/appConfig/configNetwork';
import { JsonConfigFile } from 'src/appConfig/jsonConfigFile';
import { AppConfigService } from 'src/appConfig/appConfig.service';
import { asHexColor } from 'src/utils/colorUtils';
import {
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
 * Chain ids are lowercase everywhere else in the API, so the file is read that
 * way too - `Prime` in the config still colors `prime`.
 */
const parseChainInfo = (raw: unknown, at: string): ChainInfo => {
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		throw new Error(`${at}: expected an object`);
	}

	const { chain, color } = raw as Record<string, unknown>;

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

	return { chain: chain.trim().toLowerCase(), color: parsedColor };
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
 * Source of truth for the chain display metadata (color).
 *
 * The data lives in a JSON file next to the other appConfig JSON files -
 * chainInfos.<network>.json, the network coming from app.isMainnet. It is
 * re-read whenever the file changes on disk, so recoloring a chain is an edit
 * of that file - no rebuild, no redeploy, no restart.
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

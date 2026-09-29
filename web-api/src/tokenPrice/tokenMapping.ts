import { Logger } from '@nestjs/common';
import {
	BridgingSettingsDirectionConfigDto,
	BridgingSettingsEcosystemTokenDto,
} from 'src/settings/settings.dto';
import { Lovelace } from 'src/settings/utils';
import { TrackedToken } from './tokenPrice.config';

/** One representation of an asset: a bridge tokenID and where it lives. */
export interface TokenMember {
	tokenID: number;
	/** Ecosystem name of this tokenID (xADA, cAP3X, ...), when known. */
	name?: string;
	/** Chains whose direction config defines this tokenID, ascending. */
	chains: string[];
}

/**
 * One underlying asset, as seen across the bridge.
 *
 * Bridging never changes what an asset is - a token pair `{srcTokenID,
 * dstTokenID}` in the direction config always means "the same asset, on
 * another chain". The transitive closure of every pair therefore groups all
 * representations of an asset together: ADA with xADA, AP3X with cAP3X and
 * every wrapped variant of it. That closure is what this type holds.
 */
export interface TokenClass {
	/** Members, the canonical one first, then ascending by tokenID. */
	members: TokenMember[];
	/**
	 * The representation that is the native currency of some chain (AP3X on
	 * prime, ADA on cardano, ...), when the class has one.
	 */
	canonicalTokenID?: number;
}

export const classTokenIDs = (tokenClass: TokenClass): number[] =>
	tokenClass.members.map((member) => member.tokenID);

export const classNames = (tokenClass: TokenClass): string[] => [
	...new Set(
		tokenClass.members
			.map((member) => member.name)
			.filter((name): name is string => !!name),
	),
];

/** Iterative union-find, keyed by tokenID. */
class TokenUnionFind {
	private readonly parent = new Map<number, number>();

	add(tokenID: number): number {
		if (!this.parent.has(tokenID)) {
			this.parent.set(tokenID, tokenID);
		}
		return this.find(tokenID);
	}

	find(tokenID: number): number {
		let root = tokenID;
		while (this.parent.get(root) !== root) {
			root = this.parent.get(root) ?? root;
			if (!this.parent.has(root)) {
				this.parent.set(root, root);
				break;
			}
		}

		let current = tokenID;
		while (this.parent.get(current) !== root) {
			const next = this.parent.get(current) ?? root;
			this.parent.set(current, root);
			current = next;
		}

		return root;
	}

	union(a: number, b: number): void {
		const rootA = this.add(a);
		const rootB = this.add(b);
		if (rootA !== rootB) {
			// lowest id wins, so classes are stable regardless of iteration order
			const [keep, drop] = rootA < rootB ? [rootA, rootB] : [rootB, rootA];
			this.parent.set(drop, keep);
		}
	}

	groups(): number[][] {
		const byRoot = new Map<number, number[]>();
		for (const tokenID of this.parent.keys()) {
			const root = this.find(tokenID);
			const group = byRoot.get(root);
			if (group) {
				group.push(tokenID);
			} else {
				byRoot.set(root, [tokenID]);
			}
		}
		return [...byRoot.values()].map((group) => group.sort((a, b) => a - b));
	}
}

/**
 * Derives the asset classes from the bridge settings.
 *
 * Everything comes from the settings the cardano api serves, so a new chain or
 * a new wrapped representation joins its class on its own - nothing to add
 * here, and nothing to add to the tracked tokens config either.
 */
export const buildTokenClasses = (
	directionConfig: Record<string, BridgingSettingsDirectionConfigDto>,
	ecosystemTokens: readonly BridgingSettingsEcosystemTokenDto[],
): TokenClass[] => {
	const unionFind = new TokenUnionFind();
	/** tokenID -> a chain on which it is the native currency. */
	const nativeCurrencyChain = new Map<number, string>();
	const chainsByTokenID = new Map<number, string[]>();

	for (const [chain, chainConfig] of Object.entries(directionConfig ?? {})) {
		for (const pairs of Object.values(chainConfig?.destChain ?? {})) {
			for (const pair of pairs ?? []) {
				unionFind.union(pair.srcTokenID, pair.dstTokenID);
			}
		}

		for (const [rawTokenID, token] of Object.entries(
			chainConfig?.tokens ?? {},
		)) {
			const tokenID = Number(rawTokenID);
			unionFind.add(tokenID);

			const chains = chainsByTokenID.get(tokenID);
			if (chains) {
				chains.push(chain);
			} else {
				chainsByTokenID.set(tokenID, [chain]);
			}

			if (
				token?.chainSpecific === Lovelace &&
				!token?.isWrappedCurrency &&
				!nativeCurrencyChain.has(tokenID)
			) {
				nativeCurrencyChain.set(tokenID, chain);
			}
		}
	}

	const nameByTokenID = new Map<number, string>();
	for (const token of ecosystemTokens ?? []) {
		nameByTokenID.set(token.id, token.name);
	}

	return unionFind.groups().map((tokenIDs) => {
		const canonicalTokenID = tokenIDs.find((tokenID) =>
			nativeCurrencyChain.has(tokenID),
		);

		const ordered =
			canonicalTokenID === undefined
				? tokenIDs
				: [
						canonicalTokenID,
						...tokenIDs.filter((tokenID) => tokenID !== canonicalTokenID),
					];

		return {
			canonicalTokenID,
			members: ordered.map((tokenID) => ({
				tokenID,
				name: nameByTokenID.get(tokenID),
				chains: (chainsByTokenID.get(tokenID) ?? []).sort(),
			})),
		};
	});
};

/** Case-insensitive, whitespace-tolerant name key. */
const nameKey = (name: string): string => name.trim().toUpperCase();

export interface TokenIndex {
	/** tokenID -> tracked token symbol, for price lookups by bridge tokenID. */
	symbolByTokenID: Map<number, string>;
	/**
	 * Tracked symbol -> every bridge token it prices, canonical first. Empty
	 * for a symbol that matched no bridge asset.
	 */
	membersBySymbol: Map<string, TokenMember[]>;
	/** Tracked tokens that matched no class - typically a name mismatch. */
	unmatched: TrackedToken[];
}

/**
 * Ties the tracked tokens config to the bridge's asset classes.
 *
 * A tracked token claims a class when its symbol (or one of its aliases)
 * equals the ecosystem name of any member of that class - so configuring
 * "ADA" is enough to also price xADA, and "AP3X" also prices cAP3X, bAP3X and
 * anything wrapped later. `tokenIDs` in the config stay supported as a manual
 * escape hatch for assets the direction config does not connect.
 */
export const buildTokenIndex = (
	trackedTokens: readonly TrackedToken[],
	classes: readonly TokenClass[],
): TokenIndex => {
	const symbolByTokenID = new Map<number, string>();
	const membersBySymbol = new Map<string, TokenMember[]>(
		trackedTokens.map((token) => [token.symbol, []]),
	);

	const trackedByName = new Map<string, TrackedToken>();
	for (const token of trackedTokens) {
		for (const name of [token.symbol, ...(token.aliases ?? [])]) {
			const key = nameKey(name);
			const owner = trackedByName.get(key);
			if (owner && owner !== token) {
				Logger.error(
					`Tracked tokens: "${name}" is claimed by both ${owner.symbol} and ${token.symbol}, keeping ${owner.symbol}`,
				);
				continue;
			}
			trackedByName.set(key, token);
		}
	}

	const matched = new Set<TrackedToken>();
	const memberByTokenID = new Map<number, TokenMember>();
	for (const tokenClass of classes) {
		for (const member of tokenClass.members) {
			memberByTokenID.set(member.tokenID, member);
		}
	}

	for (const tokenClass of classes) {
		const names = classNames(tokenClass);
		const claims = new Set<TrackedToken>();
		for (const name of names) {
			const tracked = trackedByName.get(nameKey(name));
			if (tracked) {
				claims.add(tracked);
			}
		}

		if (claims.size === 0) {
			continue;
		}

		const [tracked, ...rest] = [...claims];
		if (rest.length > 0) {
			Logger.error(
				`Tracked tokens: ${[tracked, ...rest].map((token) => token.symbol).join(' and ')} all match the same asset (${names.join(', ')}), using ${tracked.symbol}`,
			);
		}

		matched.add(tracked);
		membersBySymbol.get(tracked.symbol)?.push(...tokenClass.members);
		for (const tokenID of classTokenIDs(tokenClass)) {
			symbolByTokenID.set(tokenID, tracked.symbol);
		}

		Logger.debug(
			`Tracked tokens: ${tracked.symbol} covers tokenIDs [${classTokenIDs(tokenClass).join(', ')}] (${names.join(', ') || 'unnamed'})`,
		);
	}

	// explicit ids win over the derived ones, they are the manual override
	for (const token of trackedTokens) {
		const members = membersBySymbol.get(token.symbol);
		for (const tokenID of token.tokenIDs ?? []) {
			symbolByTokenID.set(tokenID, token.symbol);
			matched.add(token);

			if (!members?.some((member) => member.tokenID === tokenID)) {
				members?.push(memberByTokenID.get(tokenID) ?? { tokenID, chains: [] });
			}
		}
	}

	return {
		symbolByTokenID,
		membersBySymbol,
		unmatched: trackedTokens.filter((token) => !matched.has(token)),
	};
};

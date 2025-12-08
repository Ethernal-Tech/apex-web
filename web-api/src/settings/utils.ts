import { BridgingSettingsDirectionConfigDto } from './settings.dto';

export const Lovelace = 'lovelace';

export const getCurrencyIDFromDirectionConfig = (
	dirConfig: {
		[key: string]: BridgingSettingsDirectionConfigDto;
	},
	chain: string,
): number | undefined => {
	if (!dirConfig[chain] || !dirConfig[chain].tokens) {
		return;
	}

	const currencyID = Object.keys(dirConfig[chain].tokens).find(
		(x: string) =>
			(dirConfig[chain].tokens[+x] || {}).chainSpecific === Lovelace,
	);

	return currencyID ? +currencyID : undefined;
};

export const getWrappedCurrencyIDFromDirectionConfig = (
	dirConfig: {
		[key: string]: BridgingSettingsDirectionConfigDto;
	},
	chain: string,
): number | undefined => {
	if (!dirConfig[chain] || !dirConfig[chain].tokens) {
		return;
	}

	const wrappedCurrencyID = Object.keys(dirConfig[chain].tokens).find(
		(x: string) => (dirConfig[chain].tokens[+x] || {}).isWrappedCurrency,
	);

	return wrappedCurrencyID ? +wrappedCurrencyID : undefined;
};

export const getWrappedTokensFromDirectionConfig = (
	dirConfig: { [key: string]: BridgingSettingsDirectionConfigDto },
	srcChain: string,
	dstChain: string,
	forceIncludeIds: number[] = [],
): number[] => {
	const sourceConfig = dirConfig[srcChain];

	if (!sourceConfig || !sourceConfig.destChain || !sourceConfig.tokens) {
		return [];
	}

	const destinationPairs = sourceConfig.destChain[dstChain];

	if (!destinationPairs) {
		return [];
	}

	const tokenDefinitions = sourceConfig.tokens;

	return destinationPairs
		.filter((pair) => {
			const tokenDef = tokenDefinitions[pair.srcTokenID];

			const isWrapped = tokenDef && tokenDef.isWrappedCurrency === true;

			const isForcedException = forceIncludeIds.includes(pair.srcTokenID);

			return isWrapped || isForcedException;
		})
		.map((pair) => pair.srcTokenID);
};

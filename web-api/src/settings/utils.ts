import {
	BridgingSettingsDirectionConfigDto,
	BridgingSettingsEcosystemTokenDto,
} from './settings.dto';

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

export const getDirectionTokenIDsFromDirectionConfig = (
	dirConfig: { [key: string]: BridgingSettingsDirectionConfigDto },
	srcChain: string,
	dstChain: string,
): number[] => {
	const sourceConfig = dirConfig[srcChain];

	if (!sourceConfig || !sourceConfig.destChain || !sourceConfig.tokens) {
		return [];
	}

	const destinationPairs = sourceConfig.destChain[dstChain];

	if (!destinationPairs) {
		return [];
	}

	return destinationPairs.map((pair) => pair.srcTokenID);
};

export function getTokenNameById(
	ecosystemTokens: BridgingSettingsEcosystemTokenDto[],
	id: number,
) {
	const token = ecosystemTokens.find((t) => t.id === id);

	return token ? token.name : null;
}

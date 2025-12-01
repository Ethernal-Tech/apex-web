import { BridgingSettingsDirectionConfigDto } from './settings.dto';

export const Lovelace = 'lovelace';

export const getCurrencyIDFromDirectionConfig = (
	dirConfig: {
		[key: string]: BridgingSettingsDirectionConfigDto;
	},
	chain: string,
): number | undefined => {
	if (!dirConfig[chain]) {
		return;
	}

	const currencyID = Object.keys(dirConfig[chain].tokens).find(
		(x: string) => dirConfig[chain].tokens[+x].chainSpecific === Lovelace,
	);

	return currencyID ? +currencyID : undefined;
};

export const getWrappedCurrencyIDFromDirectionConfig = (
	dirConfig: {
		[key: string]: BridgingSettingsDirectionConfigDto;
	},
	chain: string,
): number | undefined => {
	if (!dirConfig[chain]) {
		return;
	}

	const wrappedCurrencyID = Object.keys(dirConfig[chain].tokens).find(
		(x: string) => dirConfig[chain].tokens[+x].isWrappedCurrency,
	);

	return wrappedCurrencyID ? +wrappedCurrencyID : undefined;
};

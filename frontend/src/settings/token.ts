import { FunctionComponent, SVGProps } from 'react';
import { ReactComponent as AdaIcon } from '../assets/token-icons/ada.svg';
import { ReactComponent as ApexIcon } from '../assets/token-icons/apex.svg';
import { ReactComponent as EthIcon } from '../assets/token-icons/eth.svg';
import { ReactComponent as UnknownTokenIcon } from '../assets/token-icons/unknown.svg';
import { BridgeTransactionDto, BridgingSettingsTokenDto } from '../swagger/apexBridgeApiService';
import { ISettingsState } from './settingsRedux';

export const LovelaceTokenName = 'lovelace';

export type TokenInfo = {
	tokenID: number;
	icon: FunctionComponent<SVGProps<SVGSVGElement>>;
	label: string;
	borderColor: string;
};

export const apexID = 1;
export const adaID = 2;
export const capexID = 3;
export const xadaID = 4;
const myTestTokenID = 5;

const ethID = Number.MAX_SAFE_INTEGER - 4;
export const bapexID = Number.MAX_SAFE_INTEGER - 3;
export const bnapexID = Number.MAX_SAFE_INTEGER - 2;
const bnbID = Number.MAX_SAFE_INTEGER - 1;

const unknownTokenInfo: TokenInfo = {
	tokenID: 0,
	icon: ApexIcon,
	label: '',
	borderColor: 'transparent',
};

const tokenInfos: Record<number, TokenInfo> = {
	[apexID]: {
		tokenID: apexID,
		icon: ApexIcon,
		label: 'AP3X',
		borderColor: '#077368',
	},
	[adaID]: {
		tokenID: adaID,
		icon: AdaIcon,
		label: 'ADA',
		borderColor: '#077368',
	},
	[capexID]: {
		tokenID: capexID,
		icon: ApexIcon,
		label: 'cAP3X',
		borderColor: '#0538AF',
	},
	[xadaID]: {
		tokenID: xadaID,
		icon: AdaIcon,
		label: 'xADA',
		borderColor: '#0538AF',
	},
	[myTestTokenID]: {
		tokenID: myTestTokenID,
		icon: UnknownTokenIcon,
		label: 'myTestToken',
		borderColor: '#0538AF',
	},
	[ethID]: {
		tokenID: ethID,
		icon: EthIcon,
		label: 'ETH',
		borderColor: '#8A92B2',
	},
	[bapexID]: {
		tokenID: bapexID,
		icon: ApexIcon,
		label: 'bAP3X',
		borderColor: '#8A92B2',
	},
	[bnapexID]: {
		tokenID: bnapexID,
		icon: ApexIcon,
		label: 'bnAP3X',
		borderColor: '#F3BA2F',
	},
	[bnbID]: {
		tokenID: bnbID,
		icon: UnknownTokenIcon,
		label: 'BNB',
		borderColor: '#F3BA2F',
	},
};

export const getTokenInfo = (tokenID: number | undefined): TokenInfo => {
	if (!tokenID) return unknownTokenInfo;

	return tokenInfos[tokenID] || unknownTokenInfo;
};

export const getCurrencyID = (
	settings: ISettingsState,
	chain: string,
): number | undefined => {
	if (!settings.directionConfig[chain]) {
		return;
	}

	const currencyID = Object.keys(settings.directionConfig[chain].tokens).find(
		(x: string) =>
			settings.directionConfig[chain].tokens[+x].chainSpecific ===
			LovelaceTokenName,
	);

	return currencyID ? +currencyID : undefined;
};

export const getWrappedCurrencyID = (
	settings: ISettingsState,
	chain: string,
): number | undefined => {
	if (!settings.directionConfig[chain]) {
		return;
	}

	const wrappedCurrencyID = Object.keys(
		settings.directionConfig[chain].tokens,
	).find(
		(x: string) =>
			settings.directionConfig[chain].tokens[+x].isWrappedCurrency,
	);

	return wrappedCurrencyID ? +wrappedCurrencyID : undefined;
};

export const getRealTokenIDFromEntity = (
	settings: ISettingsState,
	transaction: BridgeTransactionDto | undefined,
) => {
	if (!transaction) return apexID;

	if (transaction.tokenID) return transaction.tokenID;

	if (BigInt(transaction.nativeTokenAmount) === BigInt(0)) {
		const currencyID = getCurrencyID(settings, transaction.originChain);

		return currencyID || apexID;
	}

	const wrappedCurrencyID = getWrappedCurrencyID(
		settings,
		transaction.originChain,
	);

	return wrappedCurrencyID || apexID;
};

export const getTokenConfig = (
	settings: ISettingsState,
	chain: string,
	tokenID: number,
): BridgingSettingsTokenDto | undefined => {
	if (!settings.directionConfig[chain]) {
		return;
	}

	return settings.directionConfig[chain].tokens[tokenID];
};

/*

export const isWrappedToken = (token: TokenEnum | undefined): boolean =>
	token === TokenEnum.WAPEX ||
	token === TokenEnum.WADA ||
	token === TokenEnum.BAP3X ||
	token === TokenEnum.BNAP3X;

export const getCurrencyTokenInfo = (srcChain: ChainEnum): TokenInfo =>
	getTokenInfo(getChainInfo(srcChain).currencyToken);

export const isCurrencyBridgingAllowed = (
	srcChain: ChainEnum,
	dstChain: ChainEnum,
): boolean => getBridgingInfo(srcChain, dstChain).isCurrencyBridgingAllowed;

*/

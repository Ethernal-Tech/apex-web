import { FunctionComponent, SVGProps } from 'react';
// import { ReactComponent as AdaIcon } from '../assets/token-icons/ada.svg';
import { ReactComponent as ApexIcon } from '../assets/token-icons/apex.svg';
import { ReactComponent as EthIcon } from '../assets/token-icons/eth.svg';
import { ReactComponent as PolygonIcon } from '../assets/chain-icons/polygon.svg';
import { ReactComponent as UnknownTokenIcon } from '../assets/token-icons/unknown.svg';
import {
	BridgeTransactionDto,
	BridgingSettingsDirectionConfigDto,
	BridgingSettingsEcosystemTokenDto,
	BridgingSettingsTokenDto,
} from '../swagger/apexBridgeApiService';
import appSettings from './appSettings';

export const LovelaceTokenName = 'lovelace';

export interface IDirectionFullConfig {
	directionConfig: { [key: string]: BridgingSettingsDirectionConfigDto };
	ecosystemTokens: BridgingSettingsEcosystemTokenDto[];
}

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

export const lzEthID = 1000001;
export const bapexID = 1000002;
export const bnapexID = 1000003;
export const bnbID = 1000004;

const unknownTokenInfo: TokenInfo = {
	tokenID: 0,
	icon: ApexIcon,
	label: '',
	borderColor: 'transparent',
};

const testnetTokenInfos: Record<number, TokenInfo> = {
	[apexID]: {
		tokenID: apexID,
		icon: ApexIcon,
		label: 'AP3X',
		borderColor: '#077368',
	},
	[adaID]: {
		tokenID: adaID,
		icon: UnknownTokenIcon, //AdaIcon,
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
		icon: UnknownTokenIcon, //AdaIcon,
		label: 'xADA',
		borderColor: '#0538AF',
	},
	5: {
		tokenID: 5,
		icon: UnknownTokenIcon,
		label: 'myTestToken',
		borderColor: '#0538AF',
	},
	6: {
		tokenID: 6,
		icon: UnknownTokenIcon,
		label: 'TokN2',
		borderColor: '#0538AF',
	},
	7: {
		tokenID: 7,
		icon: UnknownTokenIcon,
		label: 'TokN3',
		borderColor: '#0538AF',
	},
	8: {
		tokenID: 8,
		icon: UnknownTokenIcon,
		label: 'TokC1',
		borderColor: '#0538AF',
	},
	9: {
		tokenID: 9,
		icon: UnknownTokenIcon,
		label: 'TokC2',
		borderColor: '#0538AF',
	},
	10: {
		tokenID: 10,
		icon: UnknownTokenIcon,
		label: 'TokC3',
		borderColor: '#0538AF',
	},
	11: {
		tokenID: 11,
		icon: UnknownTokenIcon,
		label: 'TokV1',
		borderColor: '#0538AF',
	},
	12: {
		tokenID: 12,
		icon: UnknownTokenIcon,
		label: 'TokV2',
		borderColor: '#0538AF',
	},
	13: {
		tokenID: 13,
		icon: UnknownTokenIcon,
		label: 'TokV3',
		borderColor: '#0538AF',
	},
	[lzEthID]: {
		tokenID: lzEthID,
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
	14: {
		tokenID: 14,
		icon: PolygonIcon,
		label: 'POL',
		borderColor: '#7B3FE4',
	},
	15: {
		tokenID: 15,
		icon: PolygonIcon,
		label: 'xPOL',
		borderColor: '#7B3FE4',
	},
	16: {
		tokenID: 16,
		icon: ApexIcon,
		label: 'pAP3X',
		borderColor: '#0538AF',
	},
	17: {
		tokenID: 17,
		icon: PolygonIcon,
		label: 'cPOL',
		borderColor: '#7B3FE4',
	},
	18: {
		tokenID: 18,
		icon: EthIcon,
		label: 'ETH',
		borderColor: '#8A92B2',
	},
	19: {
		tokenID: 19,
		icon: EthIcon,
		label: 'cETH',
		borderColor: '#8A92B2',
	},
	20: {
		tokenID: 20,
		icon: UnknownTokenIcon,
		label: 'SEI',
		borderColor: '#0538AF',
	},
};

const mainnetTokenInfos: Record<number, TokenInfo> = {
	[apexID]: {
		tokenID: apexID,
		icon: ApexIcon,
		label: 'AP3X',
		borderColor: '#077368',
	},
	[adaID]: {
		tokenID: adaID,
		icon: UnknownTokenIcon, //AdaIcon,
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
		icon: UnknownTokenIcon, //AdaIcon,
		label: 'xADA',
		borderColor: '#0538AF',
	},
	[lzEthID]: {
		tokenID: lzEthID,
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

	const tokenInfos = appSettings.isMainnet
		? mainnetTokenInfos
		: testnetTokenInfos;

	return tokenInfos[tokenID] || unknownTokenInfo;
};

export const getCurrencyID = (
	settings: IDirectionFullConfig,
	chain: string,
): number | undefined => {
	if (
		!settings.directionConfig[chain] ||
		!settings.directionConfig[chain].tokens
	) {
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
	settings: IDirectionFullConfig,
	chain: string,
): number | undefined => {
	if (
		!settings.directionConfig[chain] ||
		!settings.directionConfig[chain].tokens
	) {
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
	settings: IDirectionFullConfig,
	transaction: BridgeTransactionDto | undefined,
) => {
	if (!transaction) return apexID;

	if (transaction.tokenID) return transaction.tokenID;

	if (BigInt(transaction.nativeTokenAmount) === BigInt(0)) {
		const currencyID = getCurrencyID(settings, transaction.originChain);

		return currencyID || apexID;
	}

	// for backward compatibility reasons
	const wrappedCurrencyID = getWrappedCurrencyID(
		settings,
		transaction.originChain,
	);

	return wrappedCurrencyID || apexID;
};

export const getTokenConfig = (
	settings: IDirectionFullConfig,
	chain: string,
	tokenID: number,
): BridgingSettingsTokenDto | undefined => {
	if (!settings.directionConfig[chain]) {
		return;
	}

	return settings.directionConfig[chain].tokens[tokenID];
};

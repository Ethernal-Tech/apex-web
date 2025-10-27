import { FunctionComponent, SVGProps } from 'react';
import { TokenEnum } from '../features/enums';
import { ChainEnum } from '../swagger/apexBridgeApiService';
import { ReactComponent as AdaIcon } from '../assets/token-icons/ada.svg';
import { ReactComponent as ApexIcon } from '../assets/token-icons/apex.svg';
import { ReactComponent as EthIcon } from '../assets/token-icons/eth.svg';
import { getChainInfo } from './chain';

export type BridgingInfo = {
	isCurrencyBridgingAllowed: boolean;
	wrappedToken?: TokenEnum;
};

export type TokenInfo = {
	token: TokenEnum;
	icon: FunctionComponent<SVGProps<SVGSVGElement>>;
	label: string;
	borderColor: string;
};

const unknownTokenInfo: TokenInfo = {
	token: TokenEnum.APEX,
	icon: ApexIcon,
	label: '',
	borderColor: 'transparent',
};

const tokenInfos: TokenInfo[] = [
	{
		token: TokenEnum.APEX,
		icon: ApexIcon,
		label: 'AP3X',
		borderColor: '#077368',
	},
	{
		token: TokenEnum.WAPEX,
		icon: ApexIcon,
		label: 'cAP3X',
		borderColor: '#0538AF',
	},
	{
		token: TokenEnum.ADA,
		icon: AdaIcon,
		label: 'ADA',
		borderColor: '#077368',
	},
	{
		token: TokenEnum.WADA,
		icon: AdaIcon,
		label: 'wADA',
		borderColor: '#0538AF',
	},
	{
		token: TokenEnum.ETH,
		icon: EthIcon,
		label: 'ETH',
		borderColor: '#8A92B2',
	},
	{
		token: TokenEnum.BAP3X,
		icon: ApexIcon,
		label: 'bAP3X',
		borderColor: '#077368',
	},
	{
		token: TokenEnum.BNAP3X,
		icon: ApexIcon,
		label: 'bnAP3X',
		borderColor: '#F3BA2F',
	},
	{
		token: TokenEnum.BNB,
		icon: ApexIcon,
		label: 'BNB',
		borderColor: '#F3BA2F',
	},
];

const tokensDirection: Partial<
	Record<ChainEnum, Partial<Record<ChainEnum, BridgingInfo>>>
> = {
	[ChainEnum.Prime]: {
		[ChainEnum.Cardano]: {
			isCurrencyBridgingAllowed: true,
			// wrappedToken: TokenEnum.WAda,
		},
		[ChainEnum.Vector]: {
			isCurrencyBridgingAllowed: true,
		},
		[ChainEnum.Nexus]: {
			isCurrencyBridgingAllowed: true,
		},
	},
	[ChainEnum.Cardano]: {
		[ChainEnum.Prime]: {
			isCurrencyBridgingAllowed: false,
			wrappedToken: TokenEnum.WAPEX,
		},
		[ChainEnum.Vector]: {
			isCurrencyBridgingAllowed: true,
		},
	},
	[ChainEnum.Vector]: {
		[ChainEnum.Prime]: {
			isCurrencyBridgingAllowed: true,
		},
		[ChainEnum.Nexus]: {
			isCurrencyBridgingAllowed: true,
		},
		[ChainEnum.Cardano]: {
			isCurrencyBridgingAllowed: false,
			wrappedToken: TokenEnum.WADA,
		},
	},
	[ChainEnum.Nexus]: {
		[ChainEnum.Prime]: {
			isCurrencyBridgingAllowed: true,
		},
		[ChainEnum.Vector]: {
			isCurrencyBridgingAllowed: true,
		},
		[ChainEnum.Base]: {
			isCurrencyBridgingAllowed: true,
		},
		[ChainEnum.Bsc]: {
			isCurrencyBridgingAllowed: true,
		},
	},
	[ChainEnum.Base]: {
		[ChainEnum.Nexus]: {
			isCurrencyBridgingAllowed: false,
			wrappedToken: TokenEnum.BAP3X,
		},
		[ChainEnum.Bsc]: {
			isCurrencyBridgingAllowed: false,
			wrappedToken: TokenEnum.BAP3X,
		},
	},
	[ChainEnum.Bsc]: {
		[ChainEnum.Nexus]: {
			isCurrencyBridgingAllowed: false,
			wrappedToken: TokenEnum.BNAP3X,
		},
		[ChainEnum.Base]: {
			isCurrencyBridgingAllowed: false,
			wrappedToken: TokenEnum.BNAP3X,
		},
	},
};

export const getBridgingInfo = (
	srcChain: ChainEnum,
	dstChain: ChainEnum,
): BridgingInfo => {
	return (
		(tokensDirection[srcChain] || {})[dstChain] || {
			isCurrencyBridgingAllowed: false,
		}
	);
};

export const getToken = (
	srcChain: ChainEnum,
	dstChain: ChainEnum,
	isWrappedToken: boolean,
): TokenEnum | undefined => {
	const data = getBridgingInfo(srcChain, dstChain);
	return isWrappedToken
		? data?.wrappedToken
		: getChainInfo(srcChain).currencyToken;
};

export const getTokenInfo = (token: TokenEnum | undefined): TokenInfo => {
	if (!token) return unknownTokenInfo;

	const tokenInfo = tokenInfos.find(
		(ti) => ti.token.toLowerCase() === token.toLowerCase(),
	);

	return tokenInfo || unknownTokenInfo;
};

export const getTokenInfoBySrcDst = (
	srcChain: ChainEnum,
	dstChain: ChainEnum,
	isWrappedToken: boolean,
): TokenInfo => {
	return getTokenInfo(getToken(srcChain, dstChain, isWrappedToken));
};

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

export const getLayerZeroToken = (chain: ChainEnum): TokenEnum => {
	switch (chain) {
		case ChainEnum.Base:
			return TokenEnum.BAP3X;
		case ChainEnum.Bsc:
			return TokenEnum.BNAP3X;
		default:
			return TokenEnum.APEX;
	}
};

import { FunctionComponent, SVGProps } from "react";
import { TokenEnum } from "../features/enums";
import { ChainEnum } from "../swagger/apexBridgeApiService";
import { ReactComponent as AdaIcon } from '../assets/token-icons/ada.svg'
import { ReactComponent as ApexIcon } from '../assets/token-icons/apex.svg'
import { ChainExtendedEnum, getChainInfo } from "./chain";

export type BridgingInfo = {
  isCurrencyBridgingAllowed: boolean;
  wrappedToken?: TokenEnum;
}

export type TokenInfo = {
  token: TokenEnum;
  icon: FunctionComponent<SVGProps<SVGSVGElement>>;
  label: string;
  borderColor: string;
}

const unknownTokenInfo: TokenInfo = {
  token: TokenEnum.APEX,
  icon: ApexIcon,
  label: "",
  borderColor: "transparent"
}

const tokenInfos: Partial<Record<TokenEnum, TokenInfo>> = {
  [TokenEnum.APEX]: {
    token: TokenEnum.APEX,
    icon: ApexIcon,
    label: 'AP3X',
    borderColor: '#077368',
  },
  [TokenEnum.WAPEX]: {
    token: TokenEnum.WAPEX,
    icon: ApexIcon,
    label: 'cAP3X',
    borderColor: '#0538AF',
  },
  [TokenEnum.Ada]: {
    token: TokenEnum.Ada,
    icon: AdaIcon,
    label: 'ADA',
    borderColor: '#077368',
  },
  [TokenEnum.WAda]: {
    token: TokenEnum.WAda,
    icon: AdaIcon,
    label: 'wADA',
    borderColor: '#0538AF',
  }
}

const tokensDirection: Partial<Record<ChainExtendedEnum, Partial<Record<ChainExtendedEnum, BridgingInfo>>>> = {
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
    }
  },
  [ChainEnum.Cardano]: {
    [ChainEnum.Prime]: {
      isCurrencyBridgingAllowed: false,
      wrappedToken: TokenEnum.WAPEX,
    },
  },
  [ChainEnum.Vector]: {
    [ChainEnum.Prime]: {
      isCurrencyBridgingAllowed: true,
    },
  },
  [ChainEnum.Nexus]: {
    [ChainEnum.Prime]: {
      isCurrencyBridgingAllowed: true,
    },
  }
}

export const getBridgingInfo = (srcChain: ChainExtendedEnum, dstChain: ChainExtendedEnum): BridgingInfo => {
  return (tokensDirection[srcChain] || {})[dstChain] || { isCurrencyBridgingAllowed: false };
}

export const getToken = (srcChain: ChainExtendedEnum, dstChain: ChainExtendedEnum, isWrappedToken: boolean): TokenEnum | undefined => {
  const data = getBridgingInfo(srcChain, dstChain);
  return isWrappedToken ? data?.wrappedToken : getChainInfo(srcChain).currencyToken;
}

export const getTokenInfo = (token: TokenEnum | undefined): TokenInfo => (token && tokenInfos[token]) || unknownTokenInfo;

export const getTokenInfoBySrcDst = (srcChain: ChainExtendedEnum, dstChain: ChainExtendedEnum, isWrappedToken: boolean): TokenInfo => {
  return getTokenInfo(getToken(srcChain, dstChain, isWrappedToken));
}

export const isWrappedToken = (token: TokenEnum | undefined): boolean => token === TokenEnum.WAPEX || token === TokenEnum.WAda;

export const getCurrencyTokenInfo = (srcChain: ChainExtendedEnum): TokenInfo => getTokenInfo(getChainInfo(srcChain).currencyToken)
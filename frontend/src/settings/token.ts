import { FunctionComponent, SVGProps } from "react";
import { TokenEnum } from "../features/enums";
import { ChainEnum } from "../swagger/apexBridgeApiService";
import { ReactComponent as AdaIcon } from '../assets/token-icons/ada.svg'
import { ReactComponent as ApexIcon } from '../assets/token-icons/apex.svg'
import { getChainInfo } from "./chain";

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

const tokensDirection: Partial<Record<ChainEnum, Partial<Record<ChainEnum, BridgingInfo>>>> = {
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
    [ChainEnum.Ethereum]: {
      isCurrencyBridgingAllowed: true,
    },
  },
  [ChainEnum.Ethereum]: {
    [ChainEnum.Nexus]: {
      isCurrencyBridgingAllowed: true,
    },
  }
}

export const erc20TokenInfo: Partial<Record<ChainEnum, [TokenInfo, string]>> = {

}

export const getBridgingInfo = (srcChain: ChainEnum, dstChain: ChainEnum): BridgingInfo => {
  return (tokensDirection[srcChain] || {})[dstChain] || { isCurrencyBridgingAllowed: false };
}

export const getToken = (srcChain: ChainEnum, dstChain: ChainEnum, isWrappedToken: boolean): TokenEnum | undefined => {
  const data = getBridgingInfo(srcChain, dstChain);
  return isWrappedToken ? data?.wrappedToken : getChainInfo(srcChain).currencyToken;
}

export const getTokenInfo = (token: TokenEnum | undefined): TokenInfo => (token && tokenInfos[token]) || unknownTokenInfo;

export const getTokenInfoBySrcDst = (srcChain: ChainEnum, dstChain: ChainEnum, isWrappedToken: boolean): TokenInfo => {
  return getTokenInfo(getToken(srcChain, dstChain, isWrappedToken));
}

export const isWrappedToken = (token: TokenEnum | undefined): boolean => token === TokenEnum.WAPEX || token === TokenEnum.WAda;

export const isWrappedTokenERC20 = (token: TokenEnum | undefined): boolean =>  token === TokenEnum.ERC20APEX

export const getCurrencyTokenInfo = (srcChain: ChainEnum): TokenInfo => getTokenInfo(getChainInfo(srcChain).currencyToken)
import { FunctionComponent, SVGProps } from "react";
import { TokenEnum } from "../features/enums";
import { ChainEnum } from "../swagger/apexBridgeApiService";
import { ReactComponent as ApexIcon} from "../assets/external-links/Apex.svg";
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
}

const tokensDirection: Partial<Record<ChainEnum, Partial<Record<ChainEnum, BridgingInfo>>>> = {
  [ChainEnum.Prime]: {
    [ChainEnum.Vector]: {
      isCurrencyBridgingAllowed: true,
    },
    [ChainEnum.Nexus]: {
      isCurrencyBridgingAllowed: true,
    }
  },
  [ChainEnum.Vector]: {
    [ChainEnum.Prime]: {
      isCurrencyBridgingAllowed: true,
    },
    [ChainEnum.Nexus]: {
      isCurrencyBridgingAllowed: true,
    }
  },
  [ChainEnum.Nexus]: {
    [ChainEnum.Prime]: {
      isCurrencyBridgingAllowed: true,
    },
    [ChainEnum.Vector]: {
      isCurrencyBridgingAllowed: true,
    },
  }
}

export const getBridgingInfo = (srcChain: ChainEnum, dstChain: ChainEnum): BridgingInfo => {
  return (tokensDirection[srcChain] || {})[dstChain] || { isCurrencyBridgingAllowed: false };
}

export const getToken = (srcChain: ChainEnum): TokenEnum | undefined => {
  return getChainInfo(srcChain).currencyToken;
}

export const getTokenInfo = (token: TokenEnum | undefined): TokenInfo => (token && tokenInfos[token]) || unknownTokenInfo;

export const getTokenInfoBySrc = (srcChain: ChainEnum): TokenInfo => {
  return getTokenInfo(getToken(srcChain));
}

export const getCurrencyTokenInfo = (srcChain: ChainEnum): TokenInfo => getTokenInfo(getChainInfo(srcChain).currencyToken)
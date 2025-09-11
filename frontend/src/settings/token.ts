import { FunctionComponent, SVGProps } from "react";
import { TokenEnum } from "../features/enums";
import { ChainEnum } from "../swagger/apexBridgeApiService";
import { ReactComponent as AdaIcon } from '../assets/token-icons/ada.svg'
import { ReactComponent as ApexIcon } from '../assets/token-icons/apex.svg'
import { ReactComponent as EthIcon } from '../assets/token-icons/eth.svg'
import { getChainInfo } from "./chain";
import { Token } from "@mui/icons-material";

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
  },
  [TokenEnum.ETH]: {
    token: TokenEnum.ETH,
    icon: EthIcon,
    label: 'ETH',
    borderColor: '#8A92B2',
  },
  [TokenEnum.BAP3X]: {
    token: TokenEnum.BAP3X,
    icon: ApexIcon,
    label: 'bAP3X',
    borderColor: '#077368',
  },
  [TokenEnum.BNAP3X]: {
    token: TokenEnum.BNAP3X,
    icon: ApexIcon,
    label: 'bnAP3X',
    borderColor: '#F3BA2F',
  },
  [TokenEnum.BNB]: {
    token: TokenEnum.BNB,
    icon: ApexIcon,
    label: 'BNB',
    borderColor: '#F3BA2F',
  },
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
    [ChainEnum.Base]: {
      isCurrencyBridgingAllowed: true,
    },
    [ChainEnum.Bsc]: {
      isCurrencyBridgingAllowed: true
    }
  },
  [ChainEnum.Base]: {
    [ChainEnum.Nexus]: {
      isCurrencyBridgingAllowed: false,
      wrappedToken: TokenEnum.BAP3X
    },
    [ChainEnum.Bsc]:{
      isCurrencyBridgingAllowed: false,
      wrappedToken: TokenEnum.BAP3X
    }
  },
  [ChainEnum.Bsc]: {
    [ChainEnum.Nexus]: {
      isCurrencyBridgingAllowed: false,
      wrappedToken: TokenEnum.BNAP3X
    },
    [ChainEnum.Base]: {
      isCurrencyBridgingAllowed: false,
      wrappedToken: TokenEnum.BNAP3X
    }
  }
}

export const erc20TokenInfo: Partial<Record<ChainEnum, [TokenInfo, string]>> = {
  [ChainEnum.Base]: [tokenInfos[TokenEnum.BAP3X]!, "0x4200000000000000000000000000000000000006"], // TODO: CHANGE THIS ADDRESS TO REAL
  [ChainEnum.Bsc]: [tokenInfos[TokenEnum.BNAP3X]!, "0x4200000000000000000000000000000000000006"] // TODO: CHANGE THIS ADDRESS TO REAL
  };

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

export const isWrappedToken = (token: TokenEnum | undefined): 
  boolean => token === TokenEnum.WAPEX || token === TokenEnum.WAda || token === TokenEnum.BAP3X || token === TokenEnum.BNAP3X;


export const getCurrencyTokenInfo = (srcChain: ChainEnum): TokenInfo => getTokenInfo(getChainInfo(srcChain).currencyToken)
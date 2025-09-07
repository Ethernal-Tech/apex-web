import { TokenEnum } from "../../features/enums";
import { ChainEnum } from "../../swagger/apexBridgeApiService";
import { useMemo } from "react";
import { erc20TokenInfo, getBridgingInfo, getCurrencyTokenInfo, getTokenInfo, TokenInfo } from "../../settings/token";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";

export interface TokenOption {
  value: TokenEnum;
  label: string;
  icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  borderColor: string;
}

const tokenInfoToTokenOption = (info: TokenInfo): TokenOption => {
  return {
    value: info.token,
    label: info.label,
    icon: info.icon,
    borderColor: info.borderColor,
  };
}

export const useSupportedSourceTokenOptions = (srcChain: ChainEnum, dstChain: ChainEnum): TokenOption[] => {
  const cardanoChainsNativeTokens = useSelector((state: RootState) => state.settings.cardanoChainsNativeTokens);

  return useMemo(() => {
    const bridgingInfo = getBridgingInfo(srcChain, dstChain);
    const options: TokenOption[] = [];
    if (bridgingInfo.isCurrencyBridgingAllowed) {
      options.push(tokenInfoToTokenOption(getCurrencyTokenInfo(srcChain)));
    }

    if (!!bridgingInfo.wrappedToken && !!cardanoChainsNativeTokens &&
      (cardanoChainsNativeTokens[srcChain] || []).some(x => x.dstChainID === dstChain)) {
      options.push(tokenInfoToTokenOption(getTokenInfo(bridgingInfo.wrappedToken!)));
    }

    return options;
  }, [cardanoChainsNativeTokens, srcChain, dstChain]);
};

export const useSupporedSourceLZTokenOptions = (srcChain: ChainEnum, dstChain: ChainEnum): TokenOption[] => {
  return useMemo(() =>{
    const bridgingInfo = getBridgingInfo(srcChain, dstChain);
    const options: TokenOption[] = [];

    if (bridgingInfo.isCurrencyBridgingAllowed) {
      options.push(tokenInfoToTokenOption(getCurrencyTokenInfo(srcChain)));
    }

    if (!!bridgingInfo.wrappedToken && erc20TokenInfo[srcChain]?.[0].token == bridgingInfo.wrappedToken) {
      options.push(tokenInfoToTokenOption(getTokenInfo(bridgingInfo.wrappedToken!)));
    }

    return options
  }, [srcChain, dstChain]);
}


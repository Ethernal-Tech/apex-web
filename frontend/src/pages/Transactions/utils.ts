import { useSelector } from "react-redux";
import { TokenEnum } from "../../features/enums";
import { CardanoChainsNativeTokens } from "../../redux/slices/settingsSlice";
import { ChainEnum } from "../../swagger/apexBridgeApiService";
import { useMemo } from "react";
import { RootState } from "../../redux/store";
import { getBridgingInfo, getTokenInfo, TokenInfo } from "../../settings/token";
import { getChainInfo } from "../../settings/chain";

export interface TokenOption {
  value: TokenEnum;
  label: string;
  icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  borderColor: string;
}

const isTokenEnabled = (
  cardanoChainsNativeToken: CardanoChainsNativeTokens,
  srcChain: ChainEnum, dstChain: ChainEnum,
): boolean => {
  return !!cardanoChainsNativeToken[srcChain] && cardanoChainsNativeToken[srcChain].some(x => x.dstChainID === dstChain)
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
    if (bridgingInfo.isCurrencyBridgingAllowed && isTokenEnabled(cardanoChainsNativeTokens, srcChain, dstChain)) {
      options.push(tokenInfoToTokenOption(getTokenInfo(getChainInfo(srcChain).currencyToken)));
    }

    if (!!bridgingInfo.wrappedToken && isTokenEnabled(cardanoChainsNativeTokens, srcChain, dstChain)) {
      options.push(tokenInfoToTokenOption(getTokenInfo(bridgingInfo.wrappedToken!)));
    }

    return options;
  }, [cardanoChainsNativeTokens, srcChain, dstChain]);
};


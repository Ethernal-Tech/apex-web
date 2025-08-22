import { TokenEnum } from "../../features/enums";
import { ChainEnum } from "../../swagger/apexBridgeApiService";
import { useMemo } from "react";
import { getBridgingInfo, getCurrencyTokenInfo, getTokenInfo, TokenInfo } from "../../settings/token";

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
  // TODO: figure out how to filter options with state.settings.cardanoChainsNativeTokens too
  // const cardanoChainsNativeTokens = useSelector((state: RootState) => state.settings.cardanoChainsNativeTokens);

  return useMemo(() => {
    const bridgingInfo = getBridgingInfo(srcChain, dstChain);
    const options: TokenOption[] = [];
    if (bridgingInfo.isCurrencyBridgingAllowed) {
      options.push(tokenInfoToTokenOption(getCurrencyTokenInfo(srcChain)));
    }

    if (!!bridgingInfo.wrappedToken) {
      options.push(tokenInfoToTokenOption(getTokenInfo(bridgingInfo.wrappedToken!)));
    }

    return options;
  }, [srcChain, dstChain]);
};


import { TokenEnum } from "../../features/enums";
import { ChainEnum } from "../../swagger/apexBridgeApiService";
import { useMemo } from "react";
import { getBridgingInfo, getCurrencyTokenInfo, getToken, getTokenInfo, TokenInfo } from "../../settings/token";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { getBridgingMode } from "../../settings/chain";
import { chainSchema } from "web3/lib/commonjs/eth.exports";

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
  const settings = useSelector((state: RootState) => state.settings)
  
  const bridgingModeInfo = getBridgingMode(srcChain, dstChain, settings);
  const cardanoChainsNativeTokens = bridgingModeInfo.settings?.cardanoChainsNativeTokens;

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

    if (!!bridgingInfo.wrappedToken) {
      options.push(tokenInfoToTokenOption(getTokenInfo(bridgingInfo.wrappedToken!)));
    }

    return options
  }, [srcChain, dstChain]);
}

export const useSupportedSolanaTokenOption = (): TokenOption[] =>{
  const bridgingInfo = getBridgingInfo(ChainEnum.Solana, ChainEnum.Nexus);
  const options: TokenOption[] = [];

  options.push(tokenInfoToTokenOption(getTokenInfo(bridgingInfo.wrappedToken!)));
    
  return options 
}
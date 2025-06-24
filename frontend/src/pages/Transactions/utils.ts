import { useSelector } from "react-redux";
import { TokenEnum } from "../../features/enums";
import { CardanoChainsNativeTokens } from "../../redux/slices/settingsSlice";
import { ChainEnum } from "../../swagger/apexBridgeApiService";
import { TokenEnumToLabel } from "../../utils/chainUtils";
import { tokenIcons } from "../../utils/generalUtils";
import { useMemo } from "react";
import { RootState } from "../../redux/store";

export interface TokenOption {
  value: TokenEnum;
  label: string;
  icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  borderColor: string;
  tokenEnabledConfig: {
    directionFrom: ChainEnum;
    directionTo: ChainEnum;
  };
}

export const sourceTokenOptionEnabled = (
  cardanoChainsNativeToken: CardanoChainsNativeTokens,
  directionFrom: ChainEnum, directionTo: ChainEnum,
) => {
  if (!cardanoChainsNativeToken[directionTo]) {
    return false
  }

  return !!cardanoChainsNativeToken[directionTo].find(x => x.dstChainID === directionFrom)
}

export const primeSourceTokenOptions: TokenOption[] = [
  { 
    value: TokenEnum.APEX,
    label: TokenEnumToLabel[TokenEnum.APEX],
    icon: tokenIcons[TokenEnum.APEX],
    borderColor:'#077368',
    tokenEnabledConfig: {
      directionFrom: ChainEnum.Prime,
      directionTo: ChainEnum.Cardano, 
    },
  },
  { 
    value: TokenEnum.WAda,
    label: TokenEnumToLabel[TokenEnum.WAda],
    icon: tokenIcons[TokenEnum.WAda],
    borderColor:'#077368',
    tokenEnabledConfig: {
      directionFrom: ChainEnum.Cardano,
      directionTo: ChainEnum.Prime,
    },
  },
];

export const cardanoSourceTokenOptions: TokenOption[] = [
  { 
    value: TokenEnum.Ada,
    label: TokenEnumToLabel[TokenEnum.Ada],
    icon: tokenIcons[TokenEnum.Ada],
    borderColor: '#0538AF',
    tokenEnabledConfig: {
      directionFrom: ChainEnum.Cardano,
      directionTo: ChainEnum.Prime,
    },
  },
  { 
    value: TokenEnum.WAPEX,
    label: TokenEnumToLabel[TokenEnum.WAPEX],
    icon: tokenIcons[TokenEnum.WAPEX],
    borderColor: '#0538AF',
    tokenEnabledConfig: {
      directionFrom: ChainEnum.Prime,
      directionTo: ChainEnum.Cardano,
    },
  }
];

export const useSupportedSourceTokenOptions = (chain: ChainEnum): TokenOption[] => {
  const cardanoChainsNativeTokens = useSelector((state: RootState) => state.settings.cardanoChainsNativeTokens);

  return useMemo(() => {
    const options = chain === ChainEnum.Prime
      ? primeSourceTokenOptions
      : cardanoSourceTokenOptions;

    return options.filter(x =>
      sourceTokenOptionEnabled(
        cardanoChainsNativeTokens,
        x.tokenEnabledConfig.directionFrom,
        x.tokenEnabledConfig.directionTo
      )
    );
  }, [cardanoChainsNativeTokens, chain]);
};
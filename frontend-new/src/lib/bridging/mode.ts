import {
  BridgingSettingsTokenPairDto,
  ChainApexBridgeEnum,
  ChainEnum,
  SettingsResponseDto,
} from "@/swagger/apexBridgeApiService";
import type { ISettingsState } from "@/lib/api/settings";

export enum BridgingModeEnum {
  Reactor = "reactor",
  Skyline = "skyline",
  LayerZero = "layerzero",
  Unknown = "unknown",
}

export type BridgingModeWithSettings = {
  settings?: SettingsResponseDto;
  bridgingMode: BridgingModeEnum;
};

export const isLZBridging = function (
  originChain: ChainEnum,
  destinationChain: ChainEnum,
): boolean {
  const apexChains = new Set<string>(Object.values(ChainApexBridgeEnum));

  return (
    !apexChains.has(originChain as unknown as string) ||
    !apexChains.has(destinationChain as unknown as string)
  );
};

export function isApexBridgeChain(chain: ChainEnum): boolean {
  switch (chain) {
    case ChainEnum.Prime:
    case ChainEnum.Vector:
    case ChainEnum.Nexus:
    case ChainEnum.Cardano:
    case ChainEnum.Polygon:
    case ChainEnum.Ethereum:
    case ChainEnum.Katana:
    case ChainEnum.Sei:
    case ChainEnum.Arbitrum:
    case ChainEnum.Scroll:
    case ChainEnum.Unichain:
    case ChainEnum.Solana:
      return true;
    default:
      return false; // bsc / base → false
  }
}

export function toApexBridge(
  chain: ChainEnum,
): ChainApexBridgeEnum | undefined {
  return isApexBridgeChain(chain)
    ? (chain as unknown as ChainApexBridgeEnum)
    : undefined;
}

export function toLayerZeroChainName(chain: ChainEnum): string {
  switch (chain) {
    case ChainEnum.Nexus:
      return "apexfusionnexus";
    default:
      return chain;
  }
}

export function toApexBridgeName(chain: string): ChainEnum {
  switch (chain) {
    case "apexfusionnexus":
      return ChainEnum.Nexus;
    default:
      return chain as unknown as ChainEnum;
  }
}

export function getBridgingMode(
  settings: ISettingsState,
  srcChain: ChainEnum,
  dstChain: ChainEnum,
  tokenID: number,
): BridgingModeWithSettings {
  for (const [key, value] of Object.entries(settings?.settingsPerMode || {})) {
    if (
      srcChain in value.bridgingSettings.directionConfig &&
      dstChain in value.bridgingSettings.directionConfig[srcChain].destChain &&
      value.bridgingSettings.directionConfig[srcChain].destChain[dstChain].some(
        (x: BridgingSettingsTokenPairDto) => x.srcTokenID === tokenID,
      )
    ) {
      return {
        settings: value,
        bridgingMode: key as unknown as BridgingModeEnum,
      };
    }
  }

  if (isLZBridging(srcChain, dstChain)) {
    return { bridgingMode: BridgingModeEnum.LayerZero };
  }

  return { bridgingMode: BridgingModeEnum.Unknown };
}

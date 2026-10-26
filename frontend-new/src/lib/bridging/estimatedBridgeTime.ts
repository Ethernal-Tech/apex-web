import appSettings from "@/settings/appSettings";
import { BridgingModeEnum } from "@/lib/bridging/mode";
import { ChainEnum } from "@/swagger/apexBridgeApiService";
import type { BridgingDurations } from "@/lib/api/stats";

/** Time range in minutes. Use equal min/max for a fixed value. */
export type TimeRangeMinutes = {
  min: number;
  max: number;
};

type NetworkEstimatedTimeConfig = {
  marginMinutes: number;
  chainConfirmationMinutes: Partial<Record<ChainEnum, TimeRangeMinutes>>;
  defaultChainConfirmationMinutes: TimeRangeMinutes;
};

const fixedMinutes = (minutes: number): TimeRangeMinutes => ({
  min: minutes,
  max: minutes,
});

const BRIDGE_PROCESSING_MINUTES: TimeRangeMinutes = { min: 1, max: 3 };

const LAYER_ZERO_ESTIMATED_TIME = "1-5 minutes";

const ESTIMATED_TIME_CONFIG: Record<
  "mainnet" | "testnet",
  NetworkEstimatedTimeConfig
> = {
  testnet: {
    marginMinutes: 2,
    defaultChainConfirmationMinutes: fixedMinutes(5),
    chainConfirmationMinutes: {
      [ChainEnum.Prime]: fixedMinutes(5),
      [ChainEnum.Cardano]: fixedMinutes(5),
      [ChainEnum.Vector]: fixedMinutes(1),
      [ChainEnum.Nexus]: fixedMinutes(1),
      [ChainEnum.Solana]: fixedMinutes(2),
    },
  },
  mainnet: {
    marginMinutes: 3,
    defaultChainConfirmationMinutes: fixedMinutes(5),
    chainConfirmationMinutes: {
      [ChainEnum.Prime]: fixedMinutes(15),
      [ChainEnum.Cardano]: fixedMinutes(15),
      [ChainEnum.Vector]: fixedMinutes(3),
      [ChainEnum.Nexus]: fixedMinutes(1),
      [ChainEnum.Solana]: fixedMinutes(2),
    },
  },
};

const getNetworkType = (isMainnet: boolean): "mainnet" | "testnet" =>
  isMainnet ? "mainnet" : "testnet";

const getChainConfirmationMinutes = (
  network: "mainnet" | "testnet",
  chain: ChainEnum,
): TimeRangeMinutes => {
  const config = ESTIMATED_TIME_CONFIG[network];
  return (
    config.chainConfirmationMinutes[chain] ??
    config.defaultChainConfirmationMinutes
  );
};

export const formatEstimatedBridgeTime = (
  minMinutes: number,
  maxMinutes: number,
): string => {
  const min = Math.max(0, minMinutes);
  const max = Math.max(min, maxMinutes);

  if (min === max) {
    return `${min} minute${min === 1 ? "" : "s"}`;
  }

  return `${min}-${max} minutes`;
};

export const getApexEstimatedBridgeTime = (
  srcChain: ChainEnum,
  dstChain: ChainEnum,
  isMainnet: boolean = appSettings.isMainnet,
): string => {
  const network = getNetworkType(isMainnet);
  const { marginMinutes } = ESTIMATED_TIME_CONFIG[network];
  const srcConfirmation = getChainConfirmationMinutes(network, srcChain);
  const dstConfirmation = getChainConfirmationMinutes(network, dstChain);

  const minTotal =
    srcConfirmation.min + BRIDGE_PROCESSING_MINUTES.min + dstConfirmation.min;
  const maxTotal =
    srcConfirmation.max +
    BRIDGE_PROCESSING_MINUTES.max +
    dstConfirmation.max +
    marginMinutes;

  return formatEstimatedBridgeTime(minTotal, maxTotal);
};

export const getLayerZeroEstimatedBridgeTime = (): string =>
  LAYER_ZERO_ESTIMATED_TIME;

/**
 * Formats a measured duration range (median to 90th percentile) in whole minutes,
 * rounded up so the estimate does not promise more than the bridge delivers.
 */
export const formatMeasuredBridgeTime = (
  medianSeconds: number,
  p90Seconds: number,
): string => {
  if (p90Seconds < 60) {
    return "Less than a minute";
  }

  return formatEstimatedBridgeTime(
    Math.max(1, Math.ceil(medianSeconds / 60)),
    Math.ceil(p90Seconds / 60),
  );
};

/**
 * The estimated bridging time of a direction. Measured from its latest finished
 * transactions when there are enough of them, otherwise taken from the static
 * table above.
 */
export const getEstimatedBridgeTime = (
  bridgingMode: BridgingModeEnum,
  srcChain: ChainEnum,
  dstChain: ChainEnum,
  durations?: BridgingDurations,
  isMainnet: boolean = appSettings.isMainnet,
): string => {
  const measured = durations?.directions.find(
    (d) => d.originChain === srcChain && d.destinationChain === dstChain,
  );
  if (measured) {
    return formatMeasuredBridgeTime(
      measured.medianSeconds,
      measured.p90Seconds,
    );
  }

  if (bridgingMode === BridgingModeEnum.LayerZero) {
    return getLayerZeroEstimatedBridgeTime();
  }

  return getApexEstimatedBridgeTime(srcChain, dstChain, isMainnet);
};

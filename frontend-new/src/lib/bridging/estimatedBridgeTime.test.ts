import { describe, expect, it } from "vitest";
import {
  formatMeasuredBridgeTime,
  getApexEstimatedBridgeTime,
  getEstimatedBridgeTime,
  getLayerZeroEstimatedBridgeTime,
} from "@/lib/bridging/estimatedBridgeTime";
import { BridgingModeEnum } from "@/lib/bridging/mode";
import { ChainEnum } from "@/swagger/apexBridgeApiService";
import type { BridgingDurations } from "@/lib/api/stats";

const durations: BridgingDurations = {
  directions: [
    {
      originChain: ChainEnum.Vector,
      destinationChain: ChainEnum.Nexus,
      medianSeconds: 40,
      p90Seconds: 55,
      sampleCount: 20,
    },
    {
      originChain: ChainEnum.Prime,
      destinationChain: ChainEnum.Nexus,
      medianSeconds: 300,
      p90Seconds: 610,
      sampleCount: 20,
    },
  ],
};

describe("formatMeasuredBridgeTime", () => {
  it("shows fast directions as less than a minute", () => {
    expect(formatMeasuredBridgeTime(40, 55)).toBe("Less than a minute");
  });

  it("rounds the range up to whole minutes", () => {
    expect(formatMeasuredBridgeTime(300, 610)).toBe("5-11 minutes");
    expect(formatMeasuredBridgeTime(30, 90)).toBe("1-2 minutes");
    expect(formatMeasuredBridgeTime(120, 120)).toBe("2 minutes");
  });
});

describe("getEstimatedBridgeTime", () => {
  it("uses the measured durations of the direction", () => {
    expect(
      getEstimatedBridgeTime(
        BridgingModeEnum.Skyline,
        ChainEnum.Prime,
        ChainEnum.Nexus,
        durations,
      ),
    ).toBe("5-11 minutes");
    expect(
      getEstimatedBridgeTime(
        BridgingModeEnum.Skyline,
        ChainEnum.Vector,
        ChainEnum.Nexus,
        durations,
      ),
    ).toBe("Less than a minute");
  });

  it("falls back to the static table without measured durations", () => {
    expect(
      getEstimatedBridgeTime(
        BridgingModeEnum.Skyline,
        ChainEnum.Nexus,
        ChainEnum.Prime,
        durations,
        false,
      ),
    ).toBe(getApexEstimatedBridgeTime(ChainEnum.Nexus, ChainEnum.Prime, false));
    expect(
      getEstimatedBridgeTime(
        BridgingModeEnum.Skyline,
        ChainEnum.Prime,
        ChainEnum.Nexus,
        undefined,
        false,
      ),
    ).toBe(getApexEstimatedBridgeTime(ChainEnum.Prime, ChainEnum.Nexus, false));
    expect(
      getEstimatedBridgeTime(
        BridgingModeEnum.LayerZero,
        ChainEnum.Nexus,
        ChainEnum.Base,
        durations,
      ),
    ).toBe(getLayerZeroEstimatedBridgeTime());
  });
});

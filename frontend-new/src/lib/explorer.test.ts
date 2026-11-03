import { describe, expect, it } from "vitest";
import { getExplorerTxUrl, getExplorerUrl } from "@/lib/explorer";
import {
  BridgeTransactionDto,
  ChainEnum,
  TransactionStatusEnum,
} from "@/swagger/apexBridgeApiService";

const executedTx = (isRefund: boolean) =>
  new BridgeTransactionDto({
    originChain: ChainEnum.Nexus,
    destinationChain: ChainEnum.Prime,
    sourceTxHash: "aa11",
    destinationTxHash: "bb22",
    status: TransactionStatusEnum.ExecutedOnDestination,
    isLayerZero: false,
    isRefund,
  } as BridgeTransactionDto);

describe("getExplorerUrl", () => {
  it("links an executed tx to the destination chain explorer", () => {
    expect(getExplorerUrl(executedTx(false))).toBe(
      getExplorerTxUrl(ChainEnum.Prime, "bb22"),
    );
  });

  it("links a refunded tx's refund hash to the origin chain explorer", () => {
    // Nexus is EVM, so the hash also gets the 0x prefix of the origin chain.
    expect(getExplorerUrl(executedTx(true))).toBe(
      getExplorerTxUrl(ChainEnum.Nexus, "0xbb22"),
    );
  });
});

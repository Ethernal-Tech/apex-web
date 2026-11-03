import {
  BridgeTransactionDto,
  ChainEnum,
  TransactionStatusEnum,
} from "@/swagger/apexBridgeApiService";

/**
 * A bridging tx submitted to the source chain, but not yet recorded by web-api.
 * The tx is recorded once the bridge indexer observes it on the source chain.
 */
export type PendingBridgeTx = {
  originChain: ChainEnum;
  txHash: string;
  /** what the transaction page shows until the recorded tx is available */
  tx: BridgeTransactionDto;
};

type PendingTxFields = {
  originChain: ChainEnum;
  destinationChain: ChainEnum;
  txHash: string;
  senderAddress: string;
  receiverAddress: string;
  amount: bigint | string;
  nativeTokenAmount: bigint | string;
  tokenID: number;
  isLayerZero: boolean;
};

/**
 * Builds the pending tx with the same values web-api records for it, so the
 * transaction page does not change once the recorded tx replaces it.
 */
export const createPendingBridgeTx = (
  fields: PendingTxFields,
): PendingBridgeTx => ({
  originChain: fields.originChain,
  txHash: fields.txHash,
  tx: new BridgeTransactionDto({
    id: 0,
    senderAddress: fields.senderAddress,
    receiverAddresses: fields.receiverAddress,
    amount: fields.amount.toString(),
    nativeTokenAmount: fields.nativeTokenAmount.toString(),
    tokenID: fields.tokenID,
    originChain: fields.originChain,
    destinationChain: fields.destinationChain,
    sourceTxHash: fields.txHash,
    status: TransactionStatusEnum.Pending,
    createdAt: new Date(),
    isLayerZero: fields.isLayerZero,
    isRefund: false,
  }),
});

// sessionStorage keeps the pending tx for the tab that submitted it, including
// page refreshes, and drops it when the tab is closed
const storageKey = (originChain: string, txHash: string) =>
  `pendingBridgeTx:${originChain}:${txHash}`;

export const savePendingTx = (pending: PendingBridgeTx) => {
  try {
    sessionStorage.setItem(
      storageKey(pending.originChain, pending.txHash),
      JSON.stringify(pending.tx.toJSON()),
    );
  } catch {
    // storage unavailable (e.g. private mode), the page waits without local data
  }
};

export const loadPendingTx = (
  originChain: string,
  txHash: string,
): BridgeTransactionDto | undefined => {
  try {
    const stored = sessionStorage.getItem(storageKey(originChain, txHash));

    return stored ? BridgeTransactionDto.fromJS(JSON.parse(stored)) : undefined;
  } catch {
    return undefined;
  }
};

export const removePendingTx = (originChain: string, txHash: string) => {
  try {
    sessionStorage.removeItem(storageKey(originChain, txHash));
  } catch {
    // ignore
  }
};

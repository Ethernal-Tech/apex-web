/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getByTxHashAction,
  layerZeroTransferAction,
} from "@/lib/api/transaction";
import {
  CreateTransactionDto,
  CreateCardanoTransactionResponseDto,
  CreateSolanaTransactionFullResponseDto,
  ChainEnum,
  LayerZeroTransferResponseDto,
  LayerZeroTransferDto,
  TxTypeEnum,
  CreateEthTransactionFullResponseDto,
  BridgeTransactionDto,
} from "@/swagger/apexBridgeApiService";
import { ErrorResponse, tryCatchJsonByAction } from "@/lib/fetchUtils";
import { formatUserError } from "@/lib/formatUserError";
import walletHandler from "@/lib/wallet/cardanoWallet";
import evmWalletHandler from "@/lib/wallet/evmWallet";
import { Transaction } from "web3-types";
import { toApexBridgeName, toLayerZeroChainName } from "@/lib/bridging/mode";
import type { ISettingsState } from "@/lib/api/settings";
import { longRetryOptions, retry, wait } from "@/lib/wallet/utils";
type SendTransactionOptions = {
  checkRevertBeforeSending?: boolean;
};
import type { UpdateSubmitLoadingState } from "@/lib/bridging/statusUtils";
import { validateSubmitTxInputs } from "@/lib/bridging/validate";
import { captureAndThrowError, captureException } from "@/lib/wallet/errors";
import solWalletHandler from "@/lib/wallet/solWallet";
import { getFeeForMessageLamports } from "@/lib/wallet/solanaRpc";
import {
  base64ToUint8Array,
  extractMessageFromLegacyTransaction,
  uint8ArrayToBase64,
} from "@/lib/wallet/solanaTx";

type TxDetailsOptions = {
  feePercMult: bigint;
  gasLimitPercMult: bigint;
  fixedGasLimit: bigint | undefined;
  minTipCap: bigint;
};

const TX_SUCCESS = BigInt(1);

const waitForEvmReceipt = async (txHash: string) =>
  retry(
    async () => {
      const receipt = await evmWalletHandler.getTransactionReceipt(txHash);
      if (!receipt) {
        throw new Error("Receipt not available yet");
      }

      return receipt;
    },
    longRetryOptions.retryCnt,
    longRetryOptions.waitTime,
  );

const defaultTxDetailsOptions: TxDetailsOptions = {
  // Max Fee = (2 * Base Fee) + Max Priority Fee https://www.blocknative.com/blog/eip-1559-fees
  feePercMult: BigInt(200),
  gasLimitPercMult: BigInt(180),
  fixedGasLimit: undefined,
  minTipCap: BigInt(2000000000), // 2 gwei
};

const chainTxDetailsOverrides: Partial<
  Record<ChainEnum, Partial<TxDetailsOptions>>
> = {
  [ChainEnum.Polygon]: {
    minTipCap: BigInt(25000000000), // 25 gwei
  },
};

const getTxDetailsOptions = (chain: ChainEnum): TxDetailsOptions => ({
  ...defaultTxDetailsOptions,
  ...chainTxDetailsOverrides[chain],
});

// how long to wait for the bridging tx to be observed on the source chain
const bridgeTxWaitMs = 5 * 60 * 1000;
const bridgeTxPollMs = 2000;

/**
 * Waits until the bridging transaction submitted to the source chain is observed
 * by the bridge indexer and recorded by web-api.
 */
const waitForBridgeTransaction = async (
  originChain: ChainEnum,
  txHash: string,
  updateLoadingState: (newState: UpdateSubmitLoadingState) => void,
  action: string,
): Promise<BridgeTransactionDto> => {
  updateLoadingState({
    content: "Waiting for the transaction to be recorded on the chain...",
    txHash,
  });

  const deadline = Date.now() + bridgeTxWaitMs;

  while (Date.now() < deadline) {
    const res = await tryCatchJsonByAction(
      getByTxHashAction.bind(null, originChain, txHash),
      false,
    );

    if (res && !(res instanceof ErrorResponse)) {
      return res;
    }

    await wait(bridgeTxPollMs);
  }

  captureAndThrowError(
    `Transaction ${txHash} has been submitted, but it is not recorded yet. It will appear in the transaction history once it is confirmed on the source chain.`,
    "submitTx.ts",
    action,
  );
};

/**
 * Submits an EVM tx through the wallet and waits for its receipt. If the wallet
 * fails to return the receipt after the tx hash is known, the receipt is polled directly.
 */
const submitEvmTxAndWaitForReceipt = async (
  tx: Transaction,
  opts: SendTransactionOptions | undefined,
  updateLoadingState: (newState: UpdateSubmitLoadingState) => void,
) => {
  let resolvedTxHash: string | undefined;
  const onTxHash = (txHash: any) => {
    resolvedTxHash = txHash.toString();

    updateLoadingState({
      content: "Waiting for transaction receipt...",
      txHash: resolvedTxHash,
    });
  };

  const submitPromise = evmWalletHandler.submitTx(tx, opts);
  submitPromise.on("transactionHash", onTxHash);

  try {
    return await submitPromise.catch(async (error: unknown) => {
      if (!resolvedTxHash) {
        throw error;
      }

      console.warn("Wallet receipt fetch failed, polling directly:", error);
      return waitForEvmReceipt(resolvedTxHash);
    });
  } finally {
    submitPromise.off("transactionHash", onTxHash);
  }
};

export const signAndSubmitCardanoTx = async (
  values: CreateTransactionDto,
  createResponse: CreateCardanoTransactionResponseDto,
  updateLoadingState: (newState: UpdateSubmitLoadingState) => void,
) => {
  if (!walletHandler.checkWallet()) {
    captureAndThrowError(
      "Wallet not connected.",
      "submitTx.ts",
      "signAndSubmitCardanoTx",
    );
  }

  updateLoadingState({ content: "Signing the transaction..." });

  const signedTxRaw = await walletHandler.signTx(createResponse.txRaw);

  updateLoadingState({
    content: "Submitting the transaction...",
    txHash: createResponse.txHash,
  });

  try {
    await walletHandler.submitTx(signedTxRaw);
  } catch (err) {
    console.error("Cardano wallet submitTx failed:", err);

    captureAndThrowError(
      formatUserError(
        err,
        "Transaction could not be submitted. Please try again.",
      ),
      "submitTx.ts",
      "signAndSubmitCardanoTx",
    );
  }

  return waitForBridgeTransaction(
    values.originChain as unknown as ChainEnum,
    createResponse.txHash,
    updateLoadingState,
    "signAndSubmitCardanoTx",
  );
};

export const signAndSubmitEthTx = async (
  values: CreateTransactionDto,
  createResponse: CreateEthTransactionFullResponseDto,
  updateLoadingState: (newState: UpdateSubmitLoadingState) => void,
) => {
  if (!evmWalletHandler.checkWallet()) {
    captureAndThrowError(
      "Wallet not connected.",
      "submitTx.ts",
      "signAndSubmitEthTx",
    );
  }

  const originChain = values.originChain as unknown as ChainEnum;
  const txOpts = getTxDetailsOptions(originChain);

  const { approvalTx } = createResponse;
  if (approvalTx) {
    console.log("processing eth approval tx...");
    const tx: Transaction = await retry(
      () => populateTxDetails(approvalTx, TxTypeEnum.London, txOpts),
      longRetryOptions.retryCnt,
      longRetryOptions.waitTime,
    );

    updateLoadingState({
      content: "Signing and submitting the approval transaction...",
    });

    console.log("submitting eth approval tx...", tx);
    const receipt = await evmWalletHandler.submitTx(tx);
    if (receipt.status !== TX_SUCCESS) {
      captureAndThrowError(
        "approval transaction has failed. receipt status unsuccessful",
        "submitTx.ts",
        "signAndSubmitEthTx",
      );
    }

    console.log("eth approval tx has been submitted");
  }

  const tx: Transaction = await retry(
    () =>
      populateTxDetails(
        createResponse.bridgingTx.ethTx,
        TxTypeEnum.London,
        txOpts,
      ),
    longRetryOptions.retryCnt,
    longRetryOptions.waitTime,
  );

  updateLoadingState({
    content: "Signing and submitting the bridging transaction...",
  });

  console.log("submitting eth tx...", tx);

  const receipt = await submitEvmTxAndWaitForReceipt(
    tx,
    undefined,
    updateLoadingState,
  );

  if (receipt.status !== TX_SUCCESS) {
    captureAndThrowError(
      "Transaction could not be submitted. Please try again.",
      "submitTx.ts",
      "signAndSubmitEthTx",
    );
  }

  return waitForBridgeTransaction(
    originChain,
    receipt.transactionHash.toString(),
    updateLoadingState,
    "signAndSubmitEthTx",
  );
};

export const signAndSubmitSolanaTx = async (
  values: CreateTransactionDto,
  createResponse: CreateSolanaTransactionFullResponseDto,
  updateLoadingState: (newState: UpdateSubmitLoadingState) => void,
) => {
  if (!solWalletHandler.checkWallet()) {
    captureAndThrowError(
      "Wallet not connected.",
      "submitTx.ts",
      "signAndSubmitSolanaTx",
    );
  }

  const txRaw = createResponse.bridgingTx?.solTx?.txRaw;
  if (!txRaw) {
    captureAndThrowError(
      "Missing Solana txRaw in create response.",
      "submitTx.ts",
      "signAndSubmitSolanaTx",
    );
  }

  updateLoadingState({
    content: "Signing and submitting the bridging transaction...",
  });

  const signature = await solWalletHandler.signAndSendTransaction(txRaw);

  return waitForBridgeTransaction(
    values.originChain as unknown as ChainEnum,
    signature,
    updateLoadingState,
    "signAndSubmitSolanaTx",
  );
};

export const signAndSubmitLayerZeroTx = async (
  settings: ISettingsState,
  account: string,
  txType: TxTypeEnum,
  receiverAddr: string,
  createResponse: LayerZeroTransferResponseDto,
  tokenID: number,
  updateLoadingState: (newState: UpdateSubmitLoadingState) => void,
) => {
  if (!evmWalletHandler.checkWallet()) {
    captureAndThrowError(
      "Wallet not connected.",
      "submitTx.ts",
      "signAndSubmitLayerZeroTx",
    );
  }

  const originalSrcChain = toApexBridgeName(createResponse.dstChainName);
  const originalDstChain = toApexBridgeName(
    createResponse.metadata.properties.dstChainName,
  );

  const { transactionData } = createResponse;
  const opts: SendTransactionOptions = {
    checkRevertBeforeSending: false,
  };

  const txOpts = getTxDetailsOptions(originalSrcChain);

  if (transactionData.approvalTransaction) {
    console.log("processing layer zero approval tx...");
    const tx: Transaction = await retry(
      () =>
        populateTxDetails(
          {
            from: account,
            ...transactionData.transactionData.approvalTransaction,
          },
          txType,
          txOpts,
        ),
      longRetryOptions.retryCnt,
      longRetryOptions.waitTime,
    );

    updateLoadingState({
      content: "Signing and submitting the approval transaction...",
    });

    console.log("submitting layer zero approval tx...", tx);
    const receipt = await evmWalletHandler.submitTx(tx, opts);
    if (receipt.status !== TX_SUCCESS) {
      captureAndThrowError(
        "approval transaction has failed. receipt status unsuccessful",
        "submitTx.ts",
        "signAndSubmitLayerZeroTx",
      );
    }

    console.log("layer zero approval tx has been submitted");
  }

  console.log("processing layer zero send tx...");
  const sendTx: Transaction = await retry(
    () =>
      populateTxDetails(
        {
          from: account,
          ...transactionData.populatedTransaction,
        },
        txType,
        txOpts,
      ),
    longRetryOptions.retryCnt,
    longRetryOptions.waitTime,
  );

  updateLoadingState({
    content: "Signing and submitting the bridging transaction...",
  });

  console.log("submitting layer zero send tx...", sendTx);

  const receipt = await submitEvmTxAndWaitForReceipt(
    sendTx,
    opts,
    updateLoadingState,
  );

  if (receipt.status !== TX_SUCCESS) {
    captureAndThrowError(
      "Transaction could not be submitted. Please try again.",
      "submitTx.ts",
      "signAndSubmitLayerZeroTx",
    );
  }

  console.log("layer zero send tx has been submitted", sendTx.value);

  return waitForBridgeTransaction(
    originalSrcChain,
    receipt.transactionHash.toString(),
    updateLoadingState,
    "signAndSubmitLayerZeroTx",
  );
};

export const populateTxDetails = async (
  tx: Transaction,
  txType: TxTypeEnum,
  opts: TxDetailsOptions = defaultTxDetailsOptions,
): Promise<Transaction> => {
  const response = { ...tx };

  if (!tx.gas) {
    if (opts.fixedGasLimit) {
      response.gas = opts.fixedGasLimit;
      response.gasLimit = response.gas;
      console.log(
        "gas for the transaction has been set to default value",
        opts.fixedGasLimit,
      );
    } else {
      console.log("estimating gas for the transaction");
      const gasLimit = await evmWalletHandler.estimateGas(tx);
      console.log("gas for the transaction has been estimated", gasLimit);
      response.gas = (gasLimit * opts.gasLimitPercMult) / BigInt(100);
      response.gasLimit = response.gas;
    }
  }

  return txType === TxTypeEnum.London
    ? populateLondonTxDetails(response, opts)
    : populateLegacyTxDetails(response, opts);
};

const populateLegacyTxDetails = async (
  tx: Transaction,
  opts: TxDetailsOptions,
) => {
  console.log("retrieving gas price (legacy tx)");
  const gasPrice = await evmWalletHandler.getGasPrice();
  console.log("gas price (legacy tx) has been retrieved", gasPrice);
  tx.gasPrice = (gasPrice * opts.feePercMult) / BigInt(100);

  return tx;
};

const populateLondonTxDetails = async (
  tx: Transaction,
  opts: TxDetailsOptions,
) => {
  console.log("retrieving fee history for calculating tx fee");
  const feeHistory = await evmWalletHandler.getFeeHistory(5, "latest", [90]); // give 90% tip

  const baseFeePerGasList = feeHistory.baseFeePerGas as unknown as bigint[];
  if (!baseFeePerGasList) {
    captureAndThrowError(
      "feeHistory.baseFeePerGas not defined",
      "submitTx.ts",
      "populateLondonTxDetails",
    );
  }

  const baseFee =
    baseFeePerGasList.reduce((a, b) => a + b, BigInt(0)) /
    BigInt(baseFeePerGasList.length);
  let tipCap =
    feeHistory.reward.reduce((a, b) => a + BigInt(b[0]), BigInt(0)) /
    BigInt(feeHistory.reward.length);
  if (tipCap < opts.minTipCap) {
    tipCap = opts.minTipCap;
  }

  console.log(
    "fee history for calculating tx fee has been retrieved",
    "tipCap",
    tipCap,
    "baseFee",
    baseFee,
  );

  tx.maxPriorityFeePerGas = tipCap;
  tx.maxFeePerGas = (baseFee * opts.feePercMult) / BigInt(100) + tipCap;

  return tx;
};

export const estimateEthTxFee = async (
  tx: Transaction,
  txType: TxTypeEnum,
  opts: TxDetailsOptions = defaultTxDetailsOptions,
): Promise<bigint> => {
  if (!evmWalletHandler.checkWallet()) {
    captureAndThrowError(
      "Wallet not connected.",
      "submitTx.ts",
      "estimateEthTxFee",
    );
  }

  if (!tx.gas || (!tx.gasPrice && !tx.maxFeePerGas)) {
    tx = await populateTxDetails(tx, txType, opts);
  }

  const gasLimit = BigInt(tx.gas!);
  if (tx.maxFeePerGas) {
    return BigInt(tx.maxFeePerGas) * gasLimit;
  }

  return BigInt(tx.gasPrice!) * gasLimit;
};

export const estimateSolanaTxFeeLamports = async (
  txRawBase64: string,
): Promise<bigint> => {
  const message = extractMessageFromLegacyTransaction(
    base64ToUint8Array(txRawBase64),
  );
  return getFeeForMessageLamports(uint8ArrayToBase64(message));
};

export const getLayerZeroTransferResponse = async function (
  settings: ISettingsState,
  srcChain: ChainEnum,
  dstChain: ChainEnum,
  fromAddr: string,
  toAddr: string,
  amount: string,
  tokenID: number,
): Promise<LayerZeroTransferResponseDto> {
  const validationErr = validateSubmitTxInputs(
    settings,
    srcChain,
    dstChain,
    toAddr,
    amount,
    tokenID,
  );
  if (validationErr) {
    captureAndThrowError(
      validationErr,
      "submitTx.ts",
      "getLayerZeroTransferResponse",
    );
  }

  const originChainSetting = settings.layerZeroChains[srcChain];

  if (!originChainSetting)
    captureAndThrowError(
      `No LayerZero config for ${srcChain}`,
      "submitTx.ts",
      "getLayerZeroTransferResponse",
    );

  const createTxDto = new LayerZeroTransferDto({
    srcChainName: toLayerZeroChainName(srcChain),
    dstChainName: toLayerZeroChainName(dstChain),
    oftAddress: originChainSetting.oftAddress,
    from: fromAddr,
    to: toAddr,
    validate: false,
    amount: amount,
  });

  const bindedCreateAction = layerZeroTransferAction.bind(null, createTxDto);
  const createResponse = await tryCatchJsonByAction(bindedCreateAction, false);
  if (createResponse instanceof ErrorResponse) {
    captureAndThrowError(
      createResponse.err,
      "submitTx.ts",
      "getLayerZeroTransferResponse",
    );
  }

  console.log("layer zero transfer response", createResponse);

  return createResponse;
};

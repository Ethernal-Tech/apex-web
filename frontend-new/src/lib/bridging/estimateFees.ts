import { convertApexToDfm } from "@/lib/amount";
import type { ISettingsState } from "@/lib/api/settings";
import {
  createEthTransactionAction,
  createSolanaTransactionAction,
  getCardanoTransactionFeeAction,
} from "@/lib/api/transaction";
import {
  BridgingModeEnum,
  getBridgingMode,
  isLZBridging,
  toApexBridge,
} from "@/lib/bridging/mode";
import {
  estimateEthTxFee,
  estimateSolanaTxFeeLamports,
  getLayerZeroTransferResponse,
} from "@/lib/bridging/submitTx";
import { validateSubmitTxInputs } from "@/lib/bridging/validate";
import { isCardanoChain, isEvmChain, isSolanaChain } from "@/lib/chains";
import { ErrorResponse, tryCatchJsonByAction } from "@/lib/fetchUtils";
import cardanoWalletHandler from "@/lib/wallet/cardanoWallet";
import { captureAndThrowError, captureException } from "@/lib/wallet/errors";
import solWalletHandler from "@/lib/wallet/solWallet";
import {
  ChainEnum,
  CreateTransactionDto,
  TxTypeEnum,
} from "@/swagger/apexBridgeApiService";

/** Lock/unlock gas buffer when approval is needed. */
const ESTIMATED_LOCK_UNLOCK_ETH_TX_FEE = BigInt("383748002686236");
const ETH_LOCK_UNLOCK_FEE_MULTIPLIER = 1.5;

export type BridgeFeeEstimate = {
  /** Network/wallet fee in source-chain smallest units. */
  userWalletFeeDfm: string | undefined;
  /** Bridge tx fee in source-chain smallest units. */
  bridgeTxFeeDfm: string;
  /** Operation fee in source-chain smallest units (Skyline). */
  operationFeeDfm: string;
  bridgingMode: BridgingModeEnum;
};

function toChainEnum(chain: string): ChainEnum {
  return chain as unknown as ChainEnum;
}

function buildCreateTxDto(
  srcChain: string,
  dstChain: string,
  senderAddress: string,
  destinationAddress: string,
  amountDfm: string,
  tokenID: number,
): CreateTransactionDto {
  const destChain = toApexBridge(toChainEnum(dstChain));
  const originChain = toApexBridge(toChainEnum(srcChain));

  return new CreateTransactionDto({
    bridgingFee: "0",
    operationFee: "0",
    destinationChain: destChain!,
    originChain: originChain!,
    senderAddress,
    destinationAddress,
    amount: amountDfm,
    tokenID,
    utxoCacheKey: undefined,
  });
}

/**
 * Pre-fee guards: Cardano account liveness, Solana account match,
 * validateSubmitTxInputs.
 */
async function prepareFeeTxDto(
  settings: ISettingsState,
  srcChain: string,
  dstChain: string,
  senderAddress: string,
  destinationAddress: string,
  amountDfm: string,
  tokenID: number,
): Promise<CreateTransactionDto> {
  if (isCardanoChain(srcChain)) {
    // Throws if the user switched account/network in the wallet meantime.
    await cardanoWalletHandler.getChangeAddress();
  }

  if (isSolanaChain(srcChain)) {
    const walletAddress = solWalletHandler.getAddress();
    if (walletAddress !== senderAddress) {
      captureAndThrowError(
        "Wallet account changed. It looks like you switched accounts in your wallet.",
        "estimateFees.ts",
        "prepareFeeTxDto",
      );
    }
  }

  const validationErr = validateSubmitTxInputs(
    settings,
    toChainEnum(srcChain),
    toChainEnum(dstChain),
    destinationAddress,
    amountDfm,
    tokenID,
  );
  if (validationErr) {
    captureAndThrowError(validationErr, "estimateFees.ts", "prepareFeeTxDto");
  }

  return buildCreateTxDto(
    srcChain,
    dstChain,
    senderAddress,
    destinationAddress,
    amountDfm,
    tokenID,
  );
}

function defaultFees(
  settings: ISettingsState,
  srcChain: string,
  dstChain: string,
  tokenID: number,
  currencyID: number | undefined,
): BridgeFeeEstimate {
  const src = toChainEnum(srcChain);
  const dst = toChainEnum(dstChain);
  const modeInfo = getBridgingMode(settings, src, dst, tokenID);
  const bridgingSettings = modeInfo.settings?.bridgingSettings;

  const useCurrencyMin =
    isEvmChain(src) ||
    isSolanaChain(src) ||
    !currencyID ||
    tokenID === currencyID;

  const minBridge =
    bridgingSettings?.minChainFeeForBridging?.[srcChain] ||
    bridgingSettings?.minChainFeeForBridging?.[src] ||
    "0";
  const minBridgeToken = (
    bridgingSettings?.minChainFeeForBridgingTokens?.[srcChain] ||
    bridgingSettings?.minChainFeeForBridgingTokens?.[src] ||
    0
  ).toString();
  const minOp =
    bridgingSettings?.minOperationFee?.[srcChain] ||
    bridgingSettings?.minOperationFee?.[src] ||
    "0";

  return {
    userWalletFeeDfm: undefined,
    bridgeTxFeeDfm: useCurrencyMin ? minBridge : minBridgeToken,
    operationFeeDfm: minOp,
    bridgingMode: modeInfo.bridgingMode,
  };
}

async function estimateCardanoFees(
  settings: ISettingsState,
  srcChain: string,
  dstChain: string,
  senderAddress: string,
  destinationAddress: string,
  amountDfm: string,
  tokenID: number,
): Promise<
  Pick<
    BridgeFeeEstimate,
    "userWalletFeeDfm" | "bridgeTxFeeDfm" | "operationFeeDfm"
  >
> {
  const dto = await prepareFeeTxDto(
    settings,
    srcChain,
    dstChain,
    senderAddress,
    destinationAddress,
    amountDfm,
    tokenID,
  );
  const feeResponse = await tryCatchJsonByAction(
    getCardanoTransactionFeeAction.bind(null, dto),
    false,
  );
  if (feeResponse instanceof ErrorResponse) {
    throw new Error(feeResponse.err);
  }

  return {
    userWalletFeeDfm: BigInt(feeResponse?.fee || "0").toString(10),
    bridgeTxFeeDfm: BigInt(feeResponse?.bridgingFee || "0").toString(10),
    operationFeeDfm: BigInt(feeResponse?.operationFee || "0").toString(10),
  };
}

async function estimateEvmFees(
  settings: ISettingsState,
  srcChain: string,
  dstChain: string,
  senderAddress: string,
  destinationAddress: string,
  amountDfm: string,
  tokenID: number,
): Promise<
  Pick<
    BridgeFeeEstimate,
    "userWalletFeeDfm" | "bridgeTxFeeDfm" | "operationFeeDfm"
  >
> {
  const dto = await prepareFeeTxDto(
    settings,
    srcChain,
    dstChain,
    senderAddress,
    destinationAddress,
    amountDfm,
    tokenID,
  );
  const feeResponse = await tryCatchJsonByAction(
    createEthTransactionAction.bind(null, dto),
    false,
  );
  if (feeResponse instanceof ErrorResponse) {
    throw new Error(feeResponse.err);
  }

  const { bridgingTx, approvalTx } = feeResponse;
  let userWalletFeeDfm: string;

  if (approvalTx) {
    const approvalTxFee = await estimateEthTxFee(
      approvalTx,
      TxTypeEnum.London,
      false,
    );
    const totalTxFee =
      approvalTxFee +
      (BigInt(Math.floor(ETH_LOCK_UNLOCK_FEE_MULTIPLIER * 100)) *
        ESTIMATED_LOCK_UNLOCK_ETH_TX_FEE) /
        BigInt(100);
    userWalletFeeDfm = totalTxFee.toString();
  } else {
    const fee = await estimateEthTxFee(
      bridgingTx.ethTx,
      TxTypeEnum.London,
      bridgingTx.isFallback,
    );
    userWalletFeeDfm = fee.toString();
  }

  return {
    userWalletFeeDfm,
    bridgeTxFeeDfm: BigInt(bridgingTx.bridgingFee || "0").toString(10),
    operationFeeDfm: BigInt(bridgingTx.operationFee || "0").toString(10),
  };
}

async function estimateSolanaFees(
  settings: ISettingsState,
  srcChain: string,
  dstChain: string,
  senderAddress: string,
  destinationAddress: string,
  amountDfm: string,
  tokenID: number,
): Promise<
  Pick<
    BridgeFeeEstimate,
    "userWalletFeeDfm" | "bridgeTxFeeDfm" | "operationFeeDfm"
  >
> {
  const dto = await prepareFeeTxDto(
    settings,
    srcChain,
    dstChain,
    senderAddress,
    destinationAddress,
    amountDfm,
    tokenID,
  );
  const feeResponse = await tryCatchJsonByAction(
    createSolanaTransactionAction.bind(null, dto),
    false,
  );
  if (feeResponse instanceof ErrorResponse) {
    throw new Error(feeResponse.err);
  }

  const { bridgingTx, approvalTx } = feeResponse;
  let walletFeeLamports = BigInt(0);

  if (approvalTx?.txRaw) {
    const approvalFee = await estimateSolanaTxFeeLamports(approvalTx.txRaw);
    const bridgingFeeEstimate = await estimateSolanaTxFeeLamports(
      bridgingTx.solTx.txRaw,
    );
    walletFeeLamports = approvalFee + bridgingFeeEstimate;
  } else if (bridgingTx.solTx?.txRaw) {
    walletFeeLamports = await estimateSolanaTxFeeLamports(
      bridgingTx.solTx.txRaw,
    );
  }

  return {
    userWalletFeeDfm: walletFeeLamports.toString(10),
    bridgeTxFeeDfm: BigInt(bridgingTx.bridgingFee || "0").toString(10),
    operationFeeDfm: BigInt(bridgingTx.operationFee || "0").toString(10),
  };
}

async function estimateLayerZeroFees(
  settings: ISettingsState,
  srcChain: ChainEnum,
  dstChain: ChainEnum,
  senderAddress: string,
  destinationAddress: string,
  amountDfm: string,
  tokenID: number,
  currencyID: number,
  isEstimate: boolean,
): Promise<
  Pick<
    BridgeFeeEstimate,
    "userWalletFeeDfm" | "bridgeTxFeeDfm" | "operationFeeDfm"
  >
> {
  const lzResponse = await getLayerZeroTransferResponse(
    settings,
    srcChain,
    dstChain,
    senderAddress,
    destinationAddress,
    amountDfm,
    tokenID,
  );

  const txType =
    settings.layerZeroChains[srcChain]?.txType || TxTypeEnum.Legacy;

  let approvalTxFee = BigInt(0);
  if (lzResponse.transactionData.approvalTransaction) {
    approvalTxFee = await estimateEthTxFee(
      {
        ...lzResponse.transactionData.approvalTransaction,
        from: senderAddress,
      },
      txType,
      false,
    );
  }

  let bridgeTxFeeDfm = "0";
  if (tokenID === currencyID) {
    const lzAmount = BigInt(lzResponse.metadata.properties.amount);
    const valueBig = BigInt(
      lzResponse.transactionData.populatedTransaction.value,
    );
    bridgeTxFeeDfm = (valueBig - lzAmount).toString(10);
  } else {
    bridgeTxFeeDfm = lzResponse.transactionData.populatedTransaction.value;
  }

  const rawBaseTxFee = await estimateEthTxFee(
    {
      ...lzResponse.transactionData.populatedTransaction,
      from: senderAddress,
    },
    txType,
    false,
  );

  const baseTxFee = isEstimate
    ? BigInt(Math.floor(Number(rawBaseTxFee) * 1.5))
    : rawBaseTxFee;

  return {
    userWalletFeeDfm: (approvalTxFee + baseTxFee).toString(10),
    bridgeTxFeeDfm,
    operationFeeDfm: "0",
  };
}

export type EstimateBridgeFeesParams = {
  settings: ISettingsState;
  srcChain: string;
  dstChain: string;
  senderAddress: string;
  destinationAddress: string;
  /** Human-readable amount from the form. */
  amountDisplay: string;
  tokenID: number;
  currencyID: number | undefined;
  /** Currency balance in dfm - used as EVM/Solana estimate amount when form amount empty. */
  currencyBalanceDfm: string;
};

/**
 * Live fee estimation. Returns defaults from settings when inputs are
 * incomplete; never throws.
 */
export async function estimateBridgeFees(
  params: EstimateBridgeFeesParams,
): Promise<BridgeFeeEstimate> {
  const {
    settings,
    srcChain,
    dstChain,
    senderAddress,
    destinationAddress,
    amountDisplay,
    tokenID,
    currencyID,
    currencyBalanceDfm,
  } = params;

  const defaults = defaultFees(
    settings,
    srcChain,
    dstChain,
    tokenID,
    currencyID,
  );
  const src = toChainEnum(srcChain);
  const dst = toChainEnum(dstChain);
  const dest = destinationAddress.trim();
  const amount = amountDisplay.trim();

  try {
    if (isLZBridging(src, dst)) {
      if (currencyID === undefined) return defaults;

      if (!dest || !amount) {
        // Pre-estimate with dummy recipient + small amount.
        try {
          const pre = await estimateLayerZeroFees(
            settings,
            src,
            dst,
            senderAddress,
            "0x0000000000000000000000000000000000000001",
            "1000000000000",
            tokenID,
            currencyID,
            true,
          );
          return {
            ...defaults,
            ...pre,
            bridgingMode: BridgingModeEnum.LayerZero,
          };
        } catch {
          return { ...defaults, bridgingMode: BridgingModeEnum.LayerZero };
        }
      }

      const amountDfm = convertApexToDfm(amount, srcChain);
      const live = await estimateLayerZeroFees(
        settings,
        src,
        dst,
        senderAddress,
        dest,
        amountDfm,
        tokenID,
        currencyID,
        false,
      );
      return {
        ...defaults,
        ...live,
        bridgingMode: BridgingModeEnum.LayerZero,
      };
    }

    if (!dest || currencyID === undefined) {
      return defaults;
    }

    if (isCardanoChain(srcChain)) {
      if (!amount) {
        return { ...defaults, userWalletFeeDfm: undefined };
      }
      const amountDfm = convertApexToDfm(amount, srcChain);
      const live = await estimateCardanoFees(
        settings,
        srcChain,
        dstChain,
        senderAddress,
        dest,
        amountDfm,
        tokenID,
      );
      return { ...defaults, ...live };
    }

    const bridgeFee = BigInt(defaults.bridgeTxFeeDfm || "0");
    const opFee = BigInt(defaults.operationFeeDfm || "0");
    const roughMax = BigInt(currencyBalanceDfm || "0") - bridgeFee - opFee;

    // Skip live estimate when spendable currency <= 0.
    if (roughMax <= BigInt(0)) {
      return defaults;
    }

    const amountDfm = amount
      ? convertApexToDfm(amount, srcChain)
      : roughMax.toString(10);

    if (isEvmChain(srcChain)) {
      const live = await estimateEvmFees(
        settings,
        srcChain,
        dstChain,
        senderAddress,
        dest,
        amountDfm,
        tokenID,
      );
      return { ...defaults, ...live };
    }

    if (isSolanaChain(srcChain)) {
      const live = await estimateSolanaFees(
        settings,
        srcChain,
        dstChain,
        senderAddress,
        dest,
        amountDfm,
        tokenID,
      );
      return { ...defaults, ...live };
    }

    return defaults;
  } catch (e) {
    console.log("error while calculating wallet fee", e);
    captureException(e, {
      tags: { component: "estimateFees.ts", action: "estimateBridgeFees" },
    });
    return { ...defaults, userWalletFeeDfm: undefined };
  }
}

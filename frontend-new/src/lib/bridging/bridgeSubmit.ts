import { toast } from "sonner";
import { convertApexToDfm } from "@/lib/amount";
import type { ISettingsState } from "@/lib/api/settings";
import {
  createCardanoTransactionAction,
  createEthTransactionAction,
  createSolanaTransactionAction,
} from "@/lib/api/transaction";
import { isLZBridging, toApexBridge } from "@/lib/bridging/mode";
import {
  getLayerZeroTransferResponse,
  signAndSubmitCardanoTx,
  signAndSubmitEthTx,
  signAndSubmitLayerZeroTx,
  signAndSubmitSolanaTx,
} from "@/lib/bridging/submitTx";
import type { UpdateSubmitLoadingState } from "@/lib/bridging/statusUtils";
import { validateSubmitTxInputs } from "@/lib/bridging/validate";
import { isCardanoChain, isEvmChain, isSolanaChain } from "@/lib/chains";
import { ErrorResponse, tryCatchJsonByAction } from "@/lib/fetchUtils";
import cardanoWalletHandler from "@/lib/wallet/cardanoWallet";
import { captureAndThrowError, captureException } from "@/lib/wallet/errors";
import solWalletHandler from "@/lib/wallet/solWallet";
import {
  BridgeTransactionDto,
  ChainEnum,
  CreateCardanoTransactionResponseDto,
  CreateEthTransactionFullResponseDto,
  CreateSolanaTransactionFullResponseDto,
  CreateTransactionDto,
  TxTypeEnum,
} from "@/swagger/apexBridgeApiService";

export type BridgeSubmitLoadingState = {
  content: string;
  txHash: string | undefined;
};

type SubmitParams = {
  settings: ISettingsState;
  srcChain: string;
  dstChain: string;
  senderAddress: string;
  destinationAddress: string;
  /** Human-readable amount (same units as the transfer form). */
  amountDisplay: string;
  tokenID: number;
  updateLoadingState: (state: UpdateSubmitLoadingState) => void;
};

function toChainEnum(chain: string): ChainEnum {
  return chain as unknown as ChainEnum;
}

function prepareCreateTxDto(
  settings: ISettingsState,
  srcChain: string,
  dstChain: string,
  senderAddress: string,
  destinationAddress: string,
  amountDfm: string,
  tokenID: number,
): CreateTransactionDto {
  const validationErr = validateSubmitTxInputs(
    settings,
    toChainEnum(srcChain),
    toChainEnum(dstChain),
    destinationAddress,
    amountDfm,
    tokenID,
  );
  if (validationErr) {
    captureAndThrowError(
      validationErr,
      "bridgeSubmit.ts",
      "prepareCreateTxDto",
    );
  }

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

async function createCardanoTx(
  settings: ISettingsState,
  srcChain: string,
  dstChain: string,
  senderAddress: string,
  destinationAddress: string,
  amountDfm: string,
  tokenID: number,
): Promise<{
  createTxDto: CreateTransactionDto;
  createResponse: CreateCardanoTransactionResponseDto;
}> {
  // Detect mid-flow wallet account switch.
  await cardanoWalletHandler.getChangeAddress();

  const createTxDto = prepareCreateTxDto(
    settings,
    srcChain,
    dstChain,
    senderAddress,
    destinationAddress,
    amountDfm,
    tokenID,
  );
  const createResponse = await tryCatchJsonByAction(
    createCardanoTransactionAction.bind(null, createTxDto),
    false,
  );
  if (createResponse instanceof ErrorResponse) {
    captureAndThrowError(
      createResponse.err,
      "bridgeSubmit.ts",
      "createCardanoTx",
    );
  }
  return { createTxDto, createResponse };
}

async function createEthTx(
  settings: ISettingsState,
  srcChain: string,
  dstChain: string,
  senderAddress: string,
  destinationAddress: string,
  amountDfm: string,
  tokenID: number,
): Promise<{
  createTxDto: CreateTransactionDto;
  createResponse: CreateEthTransactionFullResponseDto;
}> {
  const createTxDto = prepareCreateTxDto(
    settings,
    srcChain,
    dstChain,
    senderAddress,
    destinationAddress,
    amountDfm,
    tokenID,
  );
  const createResponse = await tryCatchJsonByAction(
    createEthTransactionAction.bind(null, createTxDto),
    false,
  );
  if (createResponse instanceof ErrorResponse) {
    captureAndThrowError(createResponse.err, "bridgeSubmit.ts", "createEthTx");
  }
  return { createTxDto, createResponse };
}

async function createSolanaTx(
  settings: ISettingsState,
  srcChain: string,
  dstChain: string,
  senderAddress: string,
  destinationAddress: string,
  amountDfm: string,
  tokenID: number,
): Promise<{
  createTxDto: CreateTransactionDto;
  createResponse: CreateSolanaTransactionFullResponseDto;
}> {
  const walletAddress = solWalletHandler.getAddress();
  if (walletAddress !== senderAddress) {
    captureAndThrowError(
      "Wallet account changed. It looks like you switched accounts in your wallet.",
      "bridgeSubmit.ts",
      "createSolanaTx",
    );
  }

  const createTxDto = prepareCreateTxDto(
    settings,
    srcChain,
    dstChain,
    senderAddress,
    destinationAddress,
    amountDfm,
    tokenID,
  );
  const createResponse = await tryCatchJsonByAction(
    createSolanaTransactionAction.bind(null, createTxDto),
    false,
  );
  if (createResponse instanceof ErrorResponse) {
    captureAndThrowError(
      createResponse.err,
      "bridgeSubmit.ts",
      "createSolanaTx",
    );
  }
  return {
    createTxDto,
    createResponse: createResponse as CreateSolanaTransactionFullResponseDto,
  };
}

/**
 * Full create → sign → submit flow (Reactor / Skyline / LayerZero).
 * Amount is converted to chain smallest units before API/validation.
 */
export async function submitBridgeTransfer(
  params: SubmitParams,
): Promise<BridgeTransactionDto | undefined> {
  const {
    settings,
    srcChain,
    dstChain,
    senderAddress,
    destinationAddress,
    amountDisplay,
    tokenID,
    updateLoadingState,
  } = params;

  const amountDfm = convertApexToDfm(amountDisplay, srcChain);

  updateLoadingState({
    content: "Preparing the transaction...",
    txHash: undefined,
  });

  try {
    if (isLZBridging(toChainEnum(srcChain), toChainEnum(dstChain))) {
      const lzResponse = await getLayerZeroTransferResponse(
        settings,
        toChainEnum(srcChain),
        toChainEnum(dstChain),
        senderAddress,
        destinationAddress,
        amountDfm,
        tokenID,
      );
      return (
        (await signAndSubmitLayerZeroTx(
          settings,
          senderAddress,
          settings.layerZeroChains[srcChain]?.txType || TxTypeEnum.Legacy,
          destinationAddress,
          lzResponse,
          tokenID,
          updateLoadingState,
        )) ?? undefined
      );
    }

    if (isCardanoChain(srcChain)) {
      const created = await createCardanoTx(
        settings,
        srcChain,
        dstChain,
        senderAddress,
        destinationAddress,
        amountDfm,
        tokenID,
      );
      return (
        (await signAndSubmitCardanoTx(
          created.createTxDto,
          created.createResponse,
          updateLoadingState,
        )) ?? undefined
      );
    }

    if (isEvmChain(srcChain)) {
      const created = await createEthTx(
        settings,
        srcChain,
        dstChain,
        senderAddress,
        destinationAddress,
        amountDfm,
        tokenID,
      );
      return (
        (await signAndSubmitEthTx(
          created.createTxDto,
          created.createResponse,
          updateLoadingState,
        )) ?? undefined
      );
    }

    if (isSolanaChain(srcChain)) {
      const created = await createSolanaTx(
        settings,
        srcChain,
        dstChain,
        senderAddress,
        destinationAddress,
        amountDfm,
        tokenID,
      );
      return (
        (await signAndSubmitSolanaTx(
          created.createTxDto,
          created.createResponse,
          updateLoadingState,
        )) ?? undefined
      );
    }

    captureAndThrowError(
      `Unsupported source chain: ${srcChain}`,
      "bridgeSubmit.ts",
      "submitBridgeTransfer",
    );
  } catch (err) {
    console.log(err);
    captureException(err, {
      tags: {
        component: "bridgeSubmit.ts",
        action: "submitBridgeTransfer",
      },
    });
    if (err instanceof Error && err.message.includes("account changed")) {
      toast.error(
        "Wallet account changed. It looks like you switched accounts in your wallet.",
      );
    } else {
      toast.error(`${err}`);
    }
  }
}

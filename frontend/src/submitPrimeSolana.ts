// sendTx.ts
import walletHandler from "./features/WalletHandler";
import { UpdateSubmitLoadingState } from "./utils/statusUtils";
import { ErrorResponse, tryCatchJsonByAction } from "./utils/fetchUtils";
import { bridgingTransactionSubmittedAction } from "./pages/Transactions/action";
import {
  ChainEnum,
  CreateCardanoTransactionResponseDto,
  CreateTransactionDto,
  TransactionSubmittedDto,
} from "./swagger/apexBridgeApiService";

export const signAndSubmitSolanaCardanoTx = async (
    values: CreateTransactionDto,
    createResponse: CreateCardanoTransactionResponseDto,
    address: string,
    updateLoadingState: (newState: UpdateSubmitLoadingState) => void,
) => {
    if (!walletHandler.checkWallet()) {
        throw new Error('Wallet not connected.');
    }

    updateLoadingState({ content: 'Signing the transaction...' })

    const signedTxRaw = await walletHandler.signTx(createResponse.txRaw);

    updateLoadingState({ content: 'Submitting the transaction...', txHash: createResponse.txHash })

    await walletHandler.submitTx(signedTxRaw);

    updateLoadingState({ content: 'Recording the transaction...' })

    const amount = BigInt(createResponse.bridgingFee) + BigInt(createResponse.amount);

    const bindedSubmittedAction = bridgingTransactionSubmittedAction.bind(null, new TransactionSubmittedDto({
        originChain: ChainEnum.Prime,
        senderAddress: values.senderAddress,
        destinationChain: ChainEnum.Solana,
        receiverAddrs: [address],
        amount: amount.toString(),
        originTxHash: createResponse.txHash,
        txRaw: createResponse.txRaw,
        isFallback: createResponse.isFallback,
        nativeTokenAmount: (createResponse.nativeTokenAmount || 0).toString(),
        isLayerZero: false
    }));

    const response = await tryCatchJsonByAction(bindedSubmittedAction, false);
    if (response instanceof ErrorResponse) {
        throw new Error(response.err)
    }

    return response;
}

import { submitTransactionAction } from "../pages/Transactions/action";
import { CreateTransactionDto, CreateTransactionResponseDto, SubmitTransactionDto } from "../swagger/apexBridgeApiService";
import { tryCatchJsonByAction } from "../utils/fetchUtils";
import { Dispatch, UnknownAction } from 'redux';
import walletHandler from "../features/WalletHandler";

export const signAndSubmitTx = async (
    values: CreateTransactionDto,
    createResponse: CreateTransactionResponseDto,
    dispatch: Dispatch<UnknownAction>,
) => {
    return await signAndSubmitTxUsingWallet(values, createResponse, dispatch);
}

const signAndSubmitTxUsingWallet = async (
    values: CreateTransactionDto,
    createResponse: CreateTransactionResponseDto,
    dispatch: Dispatch<UnknownAction>,
) => {
    if (!walletHandler.checkWallet()) {
        throw new Error('Wallet not connected.');
    }

    const signedTxRaw = await walletHandler.signTx(createResponse.txRaw);

    const amount = createResponse.bridgingFee
        + values.receivers.map(x => x.amount).reduce((acc, cv) => acc + cv, 0);

    const bindedSubmitAction = submitTransactionAction.bind(null, new SubmitTransactionDto({
        originChain: values.originChain,
        senderAddress: values.senderAddress,
        destinationChain: values.destinationChain,
        receiverAddrs: values.receivers.map(x => x.address),
        amount,
        originTxHash: createResponse.txHash,
        signedTxRaw: signedTxRaw,
    }));

    const response = await tryCatchJsonByAction(bindedSubmitAction, dispatch);
    if ((response as any).err) {
        throw new Error((response as any).err)
    }
    /*
    await walletHandler.submitTx(signedTxRaw!);

    const amount = createResponse.bridgingFee
        + values.receivers.map(x => x.amount).reduce((acc, cv) => acc + cv, 0);

    const bindedSubmittedAction = bridgingTransactionSubmittedAction.bind(null, new TransactionSubmittedDto({
        originChain: values.originChain,
        senderAddress: values.senderAddress,
        destinationChain: values.destinationChain,
        receiverAddrs: values.receivers.map(x => x.address),
        amount,
        originTxHash: createResponse.txHash,
    }));

    await tryCatchJsonByAction(bindedSubmittedAction, dispatch);
    */
    return response;
}

/*
const signAndSubmitTxUsingPrivateKey = async (
    values: CreateTransactionDto,
    createResponse: CreateTransactionResponseDto,
    dispatch: Dispatch<UnknownAction>,
) => {
    const privateKey = store.getState().pkLogin.pkLogin!.privateKey

    const bindedSignAction = signTransactionAction.bind(null, new SignTransactionDto({
        signingKeyHex: privateKey,
        txRaw: createResponse.txRaw,
        txHash: createResponse.txHash,
    }));
    const signResponse = await tryCatchJsonByAction(bindedSignAction, dispatch);

    const amount = createResponse.bridgingFee
        + values.receivers.map(x => x.amount).reduce((acc, cv) => acc + cv, 0);

    const bindedSubmitAction = submitTransactionAction.bind(null, new SubmitTransactionDto({
        originChain: values.originChain,
        senderAddress: values.senderAddress,
        destinationChain: values.destinationChain,
        receiverAddrs: values.receivers.map(x => x.address),
        amount,
        originTxHash: createResponse.txHash,
        signedTxRaw: signResponse.txRaw,
    }));

    await tryCatchJsonByAction(bindedSubmitAction, dispatch);

    return true;
}
*/
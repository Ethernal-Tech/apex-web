import { bridgingTransactionSubmittedAction, signTransactionAction, submitTransactionAction } from "../pages/Transactions/action";
import appSettings from "../settings/appSettings";
import { CreateTransactionDto, CreateTransactionResponseDto, SignTransactionDto, SubmitTransactionDto, TransactionSubmittedDto } from "../swagger/apexBridgeApiService";
import { tryCatchJsonByAction } from "../utils/fetchUtils";
import { Dispatch, UnknownAction } from 'redux';
import { store } from "../redux/store";
import walletHandler from "../features/WalletHandler";

export const signAndSubmitTx = async (
    values: CreateTransactionDto,
    createResponse: CreateTransactionResponseDto,
    dispatch: Dispatch<UnknownAction>,
) => {
    const signAndSubmitFunc = appSettings.usePrivateKey
        ? signAndSubmitTxUsingPrivateKey : signAndSubmitTxUsingWallet;
    return await signAndSubmitFunc(values, createResponse, dispatch);
}

const signAndSubmitTxUsingWallet = async (
    values: CreateTransactionDto,
    createResponse: CreateTransactionResponseDto,
    dispatch: Dispatch<UnknownAction>,
) => {
    if (!walletHandler.checkWallet()) {
        return false;
    }

    const signedTxRaw = await walletHandler.signTx(createResponse.txRaw);
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

    return true;
}

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
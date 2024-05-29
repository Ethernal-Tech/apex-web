import { toast } from "react-toastify";
import { signTransactionAction, submitTransactionAction } from "../pages/Transactions/action";
import appSettings from "../settings/appSettings";
import { CreateTransactionDto, CreateTransactionResponseDto, SignTransactionDto, SubmitTransactionDto } from "../swagger/apexBridgeApiService";
import { tryCatchJsonByAction } from "../utils/fetchUtils";
import { Dispatch, UnknownAction } from 'redux';
import { store } from "../redux/store";

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
    toast.error("sign and submit using wallet not implemented")
    throw new Error("sign and submit using wallet not implemented");
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
        destinationChain: values.destinationChain,
        receiverAddrs: values.receivers.map(x => x.address),
        amount,
        originTxHash: createResponse.txHash,
        signedTxRaw: signResponse.txRaw,
    }));

    const submitResponse = await tryCatchJsonByAction(bindedSubmitAction, dispatch);

    return {
        signResponse,
        submitResponse,
    };
}
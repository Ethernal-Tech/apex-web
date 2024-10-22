import { bridgingTransactionSubmittedAction, submitCardanoTransactionAction } from "../pages/Transactions/action";
import { CreateTransactionDto, CreateCardanoTransactionResponseDto, SubmitCardanoTransactionDto, CreateEthTransactionResponseDto, TransactionSubmittedDto } from "../swagger/apexBridgeApiService";
import { tryCatchJsonByAction } from "../utils/fetchUtils";
import { Dispatch, UnknownAction } from 'redux';
import walletHandler from "../features/WalletHandler";
import evmWalletHandler from "../features/EvmWalletHandler";
import { Transaction } from 'web3-types';

export const signAndSubmitCardanoTx = async (
    values: CreateTransactionDto,
    createResponse: CreateCardanoTransactionResponseDto,
    dispatch: Dispatch<UnknownAction>,
) => {
    if (!walletHandler.checkWallet()) {
        throw new Error('Wallet not connected.');
    }

    const signedTxRaw = await walletHandler.signTx(createResponse.txRaw);

    const amount = BigInt(createResponse.bridgingFee) + BigInt(values.amount);

    const bindedSubmitAction = submitCardanoTransactionAction.bind(null, new SubmitCardanoTransactionDto({
        originChain: values.originChain,
        senderAddress: values.senderAddress,
        destinationChain: values.destinationChain,
        receiverAddrs: [values.destinationAddress],
        amount: amount.toString(),
        originTxHash: createResponse.txHash,
        signedTxRaw,
        isCentralized: createResponse.isCentralized,
    }));

    const response = await tryCatchJsonByAction(bindedSubmitAction, dispatch);
    const error = (response as any).err || (response as any).error
    if (error) {
        throw new Error(error)
    }

    return response.bridgeTx;
}

const DEFAULT_GAS_PRICE = 1000000000 // TODO - adjust gas price

export const fillOutEthTx = async (tx: Transaction, isCentralized: boolean) => {
    let gasPrice = await evmWalletHandler.getGasPrice();
    if (gasPrice === BigInt(0)) {
        gasPrice = BigInt(DEFAULT_GAS_PRICE || 0);
    }

    return {
        ...tx,
        gasPrice,
        gas: isCentralized ? 30000 : undefined,
    }
}

export const estimateEthGas = async (tx: Transaction, isCentralized: boolean) => {
    if (!evmWalletHandler.checkWallet()) {
      return BigInt(0);
    }

    const filledTx = await fillOutEthTx(tx, isCentralized)
    const estimateTx = {
        ...filledTx,
    }

    let gas = BigInt(estimateTx.gas || 0);
    if (gas === BigInt(0)) {
        gas = await evmWalletHandler.estimateGas(estimateTx);
    }

    return gas * filledTx.gasPrice;
}

export const signAndSubmitEthTx = async (
  values: CreateTransactionDto,
  createResponse: CreateEthTransactionResponseDto,
  dispatch: Dispatch<UnknownAction>,
) => {
  if (!evmWalletHandler.checkWallet()) {
      throw new Error('Wallet not connected.');
  }

  const {bridgingFee, isCentralized, ...txParts} = createResponse;
  const tx = await fillOutEthTx(txParts, isCentralized);

  const receipt = await evmWalletHandler.submitTx(tx);

  const amount = BigInt(createResponse.bridgingFee) + BigInt(values.amount);

  const bindedSubmittedAction = bridgingTransactionSubmittedAction.bind(null, new TransactionSubmittedDto({
      originChain: values.originChain,
      destinationChain: values.destinationChain,
      originTxHash: receipt.transactionHash.toString(),
      senderAddress: values.senderAddress,
      receiverAddrs: [values.destinationAddress],
      amount: amount.toString(),
      isCentralized: createResponse.isCentralized,
  }));

  const response = await tryCatchJsonByAction(bindedSubmittedAction, dispatch);
  const error = (response as any).err || (response as any).error
  if (error) {
      throw new Error(error)
  }
  
  return response;
}
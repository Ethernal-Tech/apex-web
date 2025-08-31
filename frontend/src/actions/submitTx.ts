import { bridgingTransactionSubmittedAction } from "../pages/Transactions/action";
import { CreateTransactionDto, CreateCardanoTransactionResponseDto, CreateEthTransactionResponseDto, TransactionSubmittedDto, ChainEnum } from "../swagger/apexBridgeApiService";
import { ErrorResponse, tryCatchJsonByAction } from "../utils/fetchUtils";
import walletHandler from "../features/WalletHandler";
import evmWalletHandler from "../features/EvmWalletHandler";
import { Transaction } from 'web3-types';
import { LayerZeroTransferResponse } from "../features/types";

export const signAndSubmitCardanoTx = async (
    values: CreateTransactionDto,
    createResponse: CreateCardanoTransactionResponseDto,
) => {
    if (!walletHandler.checkWallet()) {
        throw new Error('Wallet not connected.');
    }

    const signedTxRaw = await walletHandler.signTx(createResponse.txRaw);
    await walletHandler.submitTx(signedTxRaw);

    const amount = BigInt(createResponse.bridgingFee) + BigInt(createResponse.amount);

    // TODO: Set isLayerZero via createResponse

    const bindedSubmittedAction = bridgingTransactionSubmittedAction.bind(null, new TransactionSubmittedDto({
        originChain: values.originChain as unknown as ChainEnum,
        senderAddress: values.senderAddress,
        destinationChain: values.destinationChain as unknown as ChainEnum,
        receiverAddrs: [values.destinationAddress],
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

const DEFAULT_GAS_PRICE = 1000000000 // TODO - adjust gas price

export const fillOutEthTx = async (tx: Transaction, isFallback: boolean) => {
    let gasPrice = await evmWalletHandler.getGasPrice();
    if (gasPrice === BigInt(0)) {
        gasPrice = BigInt(DEFAULT_GAS_PRICE || 0);
    }

    return {
        ...tx,
        gasPrice,
        gas: isFallback ? 30000 : undefined,
    }
}

export const estimateEthGas = async (tx: Transaction, isFallback: boolean) => {
    if (!evmWalletHandler.checkWallet()) {
      return BigInt(0);
    }

    const filledTx = await fillOutEthTx(tx, isFallback)
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
) => {
  if (!evmWalletHandler.checkWallet()) {
      throw new Error('Wallet not connected.');
  }

  const {bridgingFee, isFallback, ...txParts} = createResponse;
  const tx = await fillOutEthTx(txParts, isFallback);

  const receipt = await evmWalletHandler.submitTx(tx);

  const amount = BigInt(createResponse.bridgingFee) + BigInt(values.amount);

  const bindedSubmittedAction = bridgingTransactionSubmittedAction.bind(null, new TransactionSubmittedDto({
      originChain: values.originChain as unknown as ChainEnum,
      destinationChain: values.destinationChain as unknown as ChainEnum,
      originTxHash: receipt.transactionHash.toString(),
      senderAddress: values.senderAddress,
      receiverAddrs: [values.destinationAddress],
      txRaw: JSON.stringify(
        { ...tx, block: receipt.blockNumber.toString() },
        (_: string, value: any) => typeof value === 'bigint' ? `bigint:${value.toString()}` : value,
      ),
      amount: amount.toString(),
      isFallback: createResponse.isFallback,
      nativeTokenAmount: '0',
      isLayerZero: false,
  }));

  const response = await tryCatchJsonByAction(bindedSubmittedAction, false);
  if (response instanceof ErrorResponse) {
      throw new Error(response.err)
  }
  
  return response;
}

export const signAndSubmitLayerZeroTx = async (
  createResponse: LayerZeroTransferResponse,
) => {
    if (!evmWalletHandler.checkWallet()) {
        throw new Error('Wallet not connected.');
    }

    const from = await evmWalletHandler.getAddress()

    const sendPayload = createResponse?.transactionData?.populatedTransaction;
        if (!sendPayload) throw new Error('Missing populatedTransaction from LayerZero /transfer.');


    if (createResponse.metadata.properties.approvalRequired && createResponse.transactionData.approvalTransaction) {
        const { to, data, gasLimit } = createResponse.transactionData.approvalTransaction;

        const approvalBase: Transaction = {
        from,
        to,
        data,
        };

        // If LZ gave a gasLimit, use it, else estimate
        const approvalGas = await estimateEthGas(approvalBase, false) ?? (await evmWalletHandler.estimateGas(approvalBase));

        const approvalTx: Transaction = {
            ...approvalBase,
            gas: approvalGas,
        };

        
        const receipt = await evmWalletHandler.submitTx(approvalTx);
    }

    const { to, data, gasLimit, value } = sendPayload;

    const sendBase: Transaction = {
        from,
        to,
        data,
        ...(value ? { value } : {}), // value is wei as decimal string from /transfer
    };

    const sendGas = await estimateEthGas(sendBase, false) ?? (await evmWalletHandler.estimateGas(sendBase));

    const sendTx: Transaction = {
        ...sendBase,
        gas: sendGas,
    };

      // Return the receipt from the actual send
    const receipt = await evmWalletHandler.submitTx(sendTx);


  const bindedSubmittedAction = bridgingTransactionSubmittedAction.bind(null, new TransactionSubmittedDto({
      originChain: createResponse.dstChainName,
      destinationChain: createResponse.metadata.properties.dstChainName,
      originTxHash: receipt.transactionHash.toString(),
      senderAddress: from!,
      receiverAddrs: [to!],
      txRaw: JSON.stringify(
        { ...sendTx, block: receipt.blockNumber.toString() },
        (_: string, value: any) => typeof value === 'bigint' ? `bigint:${value.toString()}` : value,
      ),
      amount: createResponse.metadata.properties.amount,
      // TODO: check for this 
      isFallback: false,
      nativeTokenAmount: '0',
      isLayerZero: true,
  }));

  const response = await tryCatchJsonByAction(bindedSubmittedAction, false);
  if (response instanceof ErrorResponse) {
      throw new Error(response.err)
  }
  
  return response;
}
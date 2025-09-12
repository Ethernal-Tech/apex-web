import { bridgingTransactionSubmittedAction } from "../pages/Transactions/action";
import { CreateTransactionDto, CreateCardanoTransactionResponseDto, CreateEthTransactionResponseDto, TransactionSubmittedDto, ChainEnum, LayerZeroTransferResponseDto } from "../swagger/apexBridgeApiService";
import { ErrorResponse, tryCatchJsonByAction } from "../utils/fetchUtils";
import walletHandler from "../features/WalletHandler";
import evmWalletHandler from "../features/EvmWalletHandler";
import { Transaction } from 'web3-types';
import { isLZWrappedChain, toApexBridgeName } from "../settings/chain";
import Web3 from "web3";

type TxDetailsOptions = {
    feePercMult: bigint;
    gasLimitPercMult: bigint
    fixedLayerZeroGasLimit: bigint | undefined;
    defaultTipCap: bigint;
}

const defaultTxDetailsOptions: TxDetailsOptions = {
    feePercMult: BigInt(180),
    gasLimitPercMult: BigInt(170),
    fixedLayerZeroGasLimit: undefined,
    defaultTipCap: BigInt(1000000000), // 1 gwei
};

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

export const signAndSubmitLayerZeroTx = async (createResponse: LayerZeroTransferResponseDto) => {
    if (!evmWalletHandler.checkWallet()) {
        throw new Error('Wallet not connected.');
    }

    const { transactionData } = createResponse;
    const from = await evmWalletHandler.getAddress();

    if (transactionData.approvalTransaction) {
        const tx: Transaction = await populateTxDetails({
            from, ...transactionData.transactionData.approvalTransaction
        });

        const receipt = await evmWalletHandler.submitTx(tx);
        if (receipt.status !== 1) {
            throw new Error('Approval transaction has been failed');
        }
    }

    const { to } = transactionData.populatedTransaction;
    const sendTx: Transaction = await populateTxDetails({
        from, ...transactionData.populatedTransaction,
    });

    // Return the receipt from the actual send
    const receipt = await evmWalletHandler.submitTx(sendTx);
    if (receipt.status !== BigInt(1)) {
        throw new Error('send transaction has been failed');
    }

    console.log("Receipt status typeof", typeof receipt.status, "Anv value", receipt.status)

    const bindedSubmittedAction = bridgingTransactionSubmittedAction.bind(null, new TransactionSubmittedDto({
        originChain: toApexBridgeName(createResponse.dstChainName),
        destinationChain: toApexBridgeName(createResponse.metadata.properties.dstChainName),
        originTxHash: receipt.transactionHash.toString(),
        senderAddress: from!,
        receiverAddrs: [to!],
        txRaw: JSON.stringify(
            { ...sendTx, block: receipt.blockNumber.toString() },
            (_: string, value: any) => typeof value === 'bigint' ? `bigint:${value.toString()}` : value,
        ),
        isFallback: false,
        isLayerZero: true,
        amount: transactionData.populatedTransaction.value,
        nativeTokenAmount: isLZWrappedChain(toApexBridgeName(createResponse.dstChainName)) ? createResponse.metadata.properties.amount : '0',
    }));

    const response = await tryCatchJsonByAction(bindedSubmittedAction, false);
    if (response instanceof ErrorResponse) {
        throw new Error(response.err)
    }

    return response;
}

export const populateTxDetails = async (
    tx: Transaction, opts: TxDetailsOptions = defaultTxDetailsOptions,
): Promise<Transaction> => {
    if (typeof window.ethereum === 'undefined') {
        throw new Error("can not instantiate web3 provider");
    }

    const web3 = new Web3(window.ethereum);
    const response = { ...tx };

    if (!tx.gas) {
        if (!!opts.fixedLayerZeroGasLimit) {
            response.gas = opts.fixedLayerZeroGasLimit;
        } else {
            const gasLimit = await web3.eth.estimateGas(tx);
            response.gas = gasLimit * opts.gasLimitPercMult / BigInt(100);
        }
    }

    try {
        const feeHistory = await web3.eth.getFeeHistory(1, 'latest', [100]);
        const baseFeePerGasList = feeHistory.baseFeePerGas as unknown as bigint[];
        if (!!baseFeePerGasList) {
            const baseFee = baseFeePerGasList[baseFeePerGasList.length - 1];
            const lastRewards = feeHistory.reward[feeHistory.reward.length - 1];
            let tipCap = BigInt(lastRewards[lastRewards.length - 1]) * opts.feePercMult / BigInt(100);
            if (tipCap === BigInt(0)) {
                tipCap = opts.defaultTipCap;
            }

            response.maxPriorityFeePerGas = tipCap;
            response.maxFeePerGas = baseFee * opts.feePercMult / BigInt(100) + tipCap;

            return response
        }
    } catch (_) { }

    // Legacy fallback
    const gasPrice = await web3.eth.getGasPrice();
    response.gasPrice = gasPrice * opts.feePercMult / BigInt(100);

    return response;
};

export const estimateEthTxFee = async (
    tx: Transaction, opts: TxDetailsOptions = defaultTxDetailsOptions,
): Promise<bigint> => {
    if (!tx.gas || (!tx.gasPrice && !tx.maxFeePerGas)) {
        tx = await populateTxDetails(tx, opts)
    }

    const gasLimit = BigInt(tx.gas!);
    if (!!tx.maxFeePerGas) {
        return BigInt(tx.maxFeePerGas) * gasLimit;
    }

    return BigInt(tx.gasPrice!) * gasLimit;
}
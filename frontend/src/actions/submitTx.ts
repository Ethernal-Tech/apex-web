import { bridgingTransactionSubmittedAction, layerZeroTransferAction } from "../pages/Transactions/action";
import { CreateTransactionDto, CreateCardanoTransactionResponseDto, CreateEthTransactionResponseDto, TransactionSubmittedDto, ChainEnum, LayerZeroTransferResponseDto, LayerZeroTransferDto } from "../swagger/apexBridgeApiService";
import { ErrorResponse, tryCatchJsonByAction } from "../utils/fetchUtils";
import walletHandler from "../features/WalletHandler";
import evmWalletHandler from "../features/EvmWalletHandler";
import { Transaction } from 'web3-types';
import { toApexBridgeName, toLayerZeroChainName } from "../settings/chain";
import Web3 from "web3";
import { isCurrencyBridgingAllowed } from "../settings/token";
import { ISettingsState } from "../redux/slices/settingsSlice";
import { SendTransactionOptions } from "web3/lib/commonjs/eth.exports";
import { validateSubmitTxInputs } from "../utils/validationUtils";

type TxDetailsOptions = {
    feePercMult: bigint;
    gasLimitPercMult: bigint
    fixedLayerZeroGasLimit: bigint | undefined;
    defaultTipCap: bigint;
}

const defaultTxDetailsOptions: TxDetailsOptions = {
    feePercMult: BigInt(180),
    gasLimitPercMult: BigInt(180),
    fixedLayerZeroGasLimit: undefined,
    defaultTipCap: BigInt(2000000000), // 2 gwei
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

export const signAndSubmitLayerZeroTx = async (receiverAddr: string, createResponse: LayerZeroTransferResponseDto) => {
    if (!evmWalletHandler.checkWallet()) {
        throw new Error('Wallet not connected.');
    }

    const { transactionData } = createResponse;
    const from = await evmWalletHandler.getAddress();
    const opts : SendTransactionOptions = {
        checkRevertBeforeSending: false,
    };

    if (transactionData.approvalTransaction) {
        console.log('processing layer zero approval tx...');
        const tx: Transaction = await populateTxDetails({
            from, ...transactionData.transactionData.approvalTransaction
        });

        console.log('submitting layer zero approval tx...', tx);
        const receipt = await evmWalletHandler.submitTx(tx, opts);
        if (receipt.status !== BigInt(1)) {
            throw new Error('Approval transaction has been failed');
        }

        console.log('layer zero approval tx has been submitted');
    }

    console.log('processing layer zero send tx...');
    const sendTx: Transaction = await populateTxDetails({
        from, ...transactionData.populatedTransaction,
    });

    console.log('submitting layer zero send tx...', sendTx);
    // Return the receipt from the actual send
    const receipt = await evmWalletHandler.submitTx(sendTx, opts);
    if (receipt.status !== BigInt(1)) {
        throw new Error('send transaction has been failed');
    }

    console.log('layer zero send tx has been submitted', sendTx.value);

    const originalSrcChain = toApexBridgeName(createResponse.dstChainName);
    const originalDstChain = toApexBridgeName(createResponse.metadata.properties.dstChainName);
    const isWrappedToken = !isCurrencyBridgingAllowed(originalSrcChain, originalDstChain);

    const bindedSubmittedAction = bridgingTransactionSubmittedAction.bind(null, new TransactionSubmittedDto({
        originChain: originalSrcChain,
        destinationChain: originalDstChain,
        originTxHash: receipt.transactionHash.toString(),
        senderAddress: from!,
        receiverAddrs: [receiverAddr],
        txRaw: JSON.stringify(
            { ...sendTx, block: receipt.blockNumber.toString() },
            (_: string, value: any) => typeof value === 'bigint' ? `bigint:${value.toString()}` : value,
        ),
        isFallback: false,
        isLayerZero: true,
        amount: transactionData.populatedTransaction.value,
        nativeTokenAmount: isWrappedToken ? createResponse.metadata.properties.amount : '0',
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
        throw new Error('can not instantiate web3 provider');
    }

    const web3 = new Web3(window.ethereum);
    const response = { ...tx };

    if (!tx.gas) {
        if (!!opts.fixedLayerZeroGasLimit) {
            response.gas = opts.fixedLayerZeroGasLimit;
            response.gasLimit = response.gas;
            console.log('gas for the transaction has been set to default value', opts.fixedLayerZeroGasLimit);
        } else {
            console.log('estimating gas for the transaction');
            const gasLimit = await web3.eth.estimateGas(tx);
            console.log('gas for the transaction has been estimated', gasLimit);
            response.gas = gasLimit * opts.gasLimitPercMult / BigInt(100);
            response.gasLimit = response.gas;
        }
    }

    try {
        console.log('retrieving fee history for calculating tx fee');
        const feeHistory = await web3.eth.getFeeHistory(5, 'latest', [90]); // give 90% tip
        const baseFeePerGasList = feeHistory.baseFeePerGas as unknown as bigint[];
        if (!!baseFeePerGasList) {
            const baseFee = baseFeePerGasList.reduce((a, b) => a + b, BigInt(0)) / BigInt(baseFeePerGasList.length);
            let tipCap = feeHistory.reward.reduce((a, b) => a + BigInt(b[0]), BigInt(0)) / BigInt(feeHistory.reward.length);
            if (tipCap === BigInt(0)) {
                tipCap = opts.defaultTipCap;
            }

            console.log('fee history for calculating tx fee has been retrieved', 'tipCap', tipCap, 'baseFee', baseFee);

            response.maxPriorityFeePerGas = tipCap;
            response.maxFeePerGas = baseFee * opts.feePercMult / BigInt(100) + tipCap;

            return response
        }
    } catch (_) { }

    // Legacy fallback
    console.log('retrieving gas price (legacy tx)');
    const gasPrice = await web3.eth.getGasPrice();
    console.log('gas price (legacy tx) has been retrieved', gasPrice);
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

export const getLayerZeroTransferResponse = async function (
    settings: ISettingsState, srcChain: ChainEnum, dstChain: ChainEnum,
    fromAddr: string, toAddr: string, amount: string,
): Promise<LayerZeroTransferResponseDto> {
    const validationErr = validateSubmitTxInputs(srcChain, dstChain, fromAddr, amount, false, settings);
    if (!!validationErr) {
        throw new Error(validationErr);
    }

    const originChainSetting = settings.layerZeroChains[srcChain];

    if (!originChainSetting) throw new Error(`No LayerZero config for ${srcChain}`);

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
        throw new Error(createResponse.err)
    }

    console.log('layer zero transfer response', createResponse);

    return createResponse;
}
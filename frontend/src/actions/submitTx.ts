import {
	CreateTransactionDto,
	CreateCardanoTransactionResponseDto,
	CreateEthTransactionResponseDto,
} from '../swagger/apexBridgeApiService';
import walletHandler from '../features/WalletHandler';
import evmWalletHandler from '../features/EvmWalletHandler';
import { Transaction } from 'web3-types';
import { UpdateSubmitLoadingState } from '../utils/statusUtils';
import { createPendingBridgeTx, PendingBridgeTx } from '../utils/pendingTx';

const TX_SUCCESS = BigInt(1);

/**
 * Signs and submits a cardano bridging tx. Resolves once the tx is submitted to the
 * source chain, before it is recorded by web-api (the bridge indexer records it).
 */
export const signAndSubmitCardanoTx = async (
	values: CreateTransactionDto,
	createResponse: CreateCardanoTransactionResponseDto,
	updateLoadingState: (newState: UpdateSubmitLoadingState) => void,
): Promise<PendingBridgeTx> => {
	if (!walletHandler.checkWallet()) {
		throw new Error('Wallet not connected.');
	}

	const amount =
		BigInt(createResponse.bridgingFee || '0') + BigInt(values.amount);

	updateLoadingState({ content: 'Signing the transaction...' });

	const signedTxRaw = await walletHandler.signTx(createResponse.txRaw);

	updateLoadingState({
		content: 'Submitting the transaction...',
		txHash: createResponse.txHash,
	});

	try {
		await walletHandler.submitTx(signedTxRaw);
	} catch (err) {
		console.error('Wallet submission failed', err);

		throw new Error('Wallet cannot submit the transaction.');
	}

	return createPendingBridgeTx({
		originChain: values.originChain,
		destinationChain: values.destinationChain,
		txHash: createResponse.txHash,
		senderAddress: values.senderAddress,
		receiverAddress: values.destinationAddress,
		amount,
	});
};

const DEFAULT_GAS_PRICE = 1000000000; // TODO - adjust gas price

export const fillOutEthTx = async (tx: Transaction) => {
	let gasPrice = await evmWalletHandler.getGasPrice();
	if (gasPrice === BigInt(0)) {
		gasPrice = BigInt(DEFAULT_GAS_PRICE || 0);
	}

	return {
		...tx,
		gasPrice,
	};
};

export const estimateEthGas = async (tx: Transaction) => {
	if (!evmWalletHandler.checkWallet()) {
		return BigInt(0);
	}

	const filledTx = await fillOutEthTx(tx);
	const estimateTx = {
		...filledTx,
	};

	let gas = BigInt(estimateTx.gas || 0);
	if (gas === BigInt(0)) {
		gas = await evmWalletHandler.estimateGas(estimateTx);
	}

	return gas * filledTx.gasPrice;
};

/**
 * Signs and submits an EVM bridging tx and waits for its receipt. Resolves once the
 * tx is executed on the source chain, before it is recorded by web-api.
 */
export const signAndSubmitEthTx = async (
	values: CreateTransactionDto,
	createResponse: CreateEthTransactionResponseDto,
	updateLoadingState: (newState: UpdateSubmitLoadingState) => void,
): Promise<PendingBridgeTx> => {
	if (!evmWalletHandler.checkWallet()) {
		throw new Error('Wallet not connected.');
	}

	const { bridgingFee, ...txParts } = createResponse;
	const tx = await fillOutEthTx(txParts);

	const amount = BigInt(bridgingFee) + BigInt(values.amount);

	updateLoadingState({
		content: 'Signing and submitting the transaction...',
	});

	const onTxHash = (txHash: unknown) => {
		updateLoadingState({
			content: 'Waiting for transaction receipt...',
			txHash: String(txHash),
		});
	};

	console.log('submitting eth tx...', tx);

	const submitPromise = evmWalletHandler.submitTx(tx);
	submitPromise.on('transactionHash', onTxHash);

	let receipt;
	try {
		receipt = await submitPromise;
	} finally {
		submitPromise.off('transactionHash', onTxHash);
	}

	if (receipt.status !== TX_SUCCESS) {
		throw new Error('Transaction submission failed');
	}

	return createPendingBridgeTx({
		originChain: values.originChain,
		destinationChain: values.destinationChain,
		txHash: receipt.transactionHash.toString(),
		senderAddress: values.senderAddress,
		receiverAddress: values.destinationAddress,
		amount,
	});
};

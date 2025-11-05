import { bridgingTransactionSubmittedAction } from '../pages/Transactions/action';
import {
	CreateTransactionDto,
	CreateCardanoTransactionResponseDto,
	CreateEthTransactionResponseDto,
	TransactionSubmittedDto,
} from '../swagger/apexBridgeApiService';
import { ErrorResponse, tryCatchJsonByAction } from '../utils/fetchUtils';
import walletHandler from '../features/WalletHandler';
import evmWalletHandler from '../features/EvmWalletHandler';
import { Transaction } from 'web3-types';
import { UpdateSubmitLoadingState } from '../utils/statusUtils';

export const signAndSubmitCardanoTx = async (
	values: CreateTransactionDto,
	createResponse: CreateCardanoTransactionResponseDto,
	updateLoadingState: (newState: UpdateSubmitLoadingState) => void,
) => {
	if (!walletHandler.checkWallet()) {
		throw new Error('Wallet not connected.');
	}

	updateLoadingState({ content: 'Signing the transaction...' });

	const signedTxRaw = await walletHandler.signTx(createResponse.txRaw);

	updateLoadingState({
		content: 'Submitting the transaction...',
		txHash: createResponse.txHash,
	});

	await walletHandler.submitTx(signedTxRaw);

	updateLoadingState({ content: 'Recording the transaction...' });

	const amount =
		BigInt(createResponse.bridgingFee || '0') + BigInt(values.amount);

	const bindedSubmittedAction = bridgingTransactionSubmittedAction.bind(
		null,
		new TransactionSubmittedDto({
			originChain: values.originChain,
			senderAddress: values.senderAddress,
			destinationChain: values.destinationChain,
			receiverAddrs: [values.destinationAddress],
			amount: amount.toString(10),
			originTxHash: createResponse.txHash,
			txRaw: createResponse.txRaw,
			isFallback: createResponse.isFallback,
		}),
	);

	const response = await tryCatchJsonByAction(bindedSubmittedAction, false);
	if (response instanceof ErrorResponse) {
		throw new Error(response.err);
	}

	return response;
};

const DEFAULT_GAS_PRICE = 1000000000; // TODO - adjust gas price

export const fillOutEthTx = async (tx: Transaction, isFallback: boolean) => {
	let gasPrice = await evmWalletHandler.getGasPrice();
	if (gasPrice === BigInt(0)) {
		gasPrice = BigInt(DEFAULT_GAS_PRICE || 0);
	}

	return {
		...tx,
		gasPrice,
		gas: isFallback ? 30000 : undefined,
	};
};

export const estimateEthGas = async (tx: Transaction, isFallback: boolean) => {
	if (!evmWalletHandler.checkWallet()) {
		return BigInt(0);
	}

	const filledTx = await fillOutEthTx(tx, isFallback);
	const estimateTx = {
		...filledTx,
	};

	let gas = BigInt(estimateTx.gas || 0);
	if (gas === BigInt(0)) {
		gas = await evmWalletHandler.estimateGas(estimateTx);
	}

	return gas * filledTx.gasPrice;
};

export const signAndSubmitEthTx = async (
	values: CreateTransactionDto,
	createResponse: CreateEthTransactionResponseDto,
	updateLoadingState: (newState: UpdateSubmitLoadingState) => void,
) => {
	if (!evmWalletHandler.checkWallet()) {
		throw new Error('Wallet not connected.');
	}

	const { bridgingFee, isFallback, ...txParts } = createResponse;
	const tx = await fillOutEthTx(txParts, isFallback);

	updateLoadingState({
		content: 'Signing and submitting the transaction...',
	});

	const receipt = await evmWalletHandler.submitTx(tx);

	updateLoadingState({
		content: 'Recording the transaction...',
		txHash: receipt.transactionHash.toString(),
	});

	const amount = BigInt(bridgingFee) + BigInt(values.amount);

	const bindedSubmittedAction = bridgingTransactionSubmittedAction.bind(
		null,
		new TransactionSubmittedDto({
			originChain: values.originChain,
			destinationChain: values.destinationChain,
			originTxHash: receipt.transactionHash.toString(),
			senderAddress: values.senderAddress,
			receiverAddrs: [values.destinationAddress],
			txRaw: JSON.stringify(
				{ ...tx, block: receipt.blockNumber.toString() },
				(_: string, value: any) =>
					typeof value === 'bigint'
						? `bigint:${value.toString(10)}`
						: value,
			),
			amount: amount.toString(10),
			isFallback: createResponse.isFallback,
		}),
	);

	const response = await tryCatchJsonByAction(bindedSubmittedAction, false);
	if (response instanceof ErrorResponse) {
		throw new Error(response.err);
	}

	return response;
};

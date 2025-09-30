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

export const signAndSubmitCardanoTx = async (
	values: CreateTransactionDto,
	createResponse: CreateCardanoTransactionResponseDto,
) => {
	if (!walletHandler.checkWallet()) {
		throw new Error('Wallet not connected.');
	}

	const signedTxRaw = await walletHandler.signTx(createResponse.txRaw);
	await walletHandler.submitTx(signedTxRaw);

	const amount = BigInt(createResponse.bridgingFee) + BigInt(values.amount);

	const bindedSubmittedAction = bridgingTransactionSubmittedAction.bind(
		null,
		new TransactionSubmittedDto({
			originChain: values.originChain,
			senderAddress: values.senderAddress.trim(),
			destinationChain: values.destinationChain,
			receiverAddrs: [values.destinationAddress.trim()],
			amount: amount.toString(),
			originTxHash: createResponse.txHash.trim(),
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
) => {
	if (!evmWalletHandler.checkWallet()) {
		throw new Error('Wallet not connected.');
	}

	const { bridgingFee, isFallback, ...txParts } = createResponse;
	const tx = await fillOutEthTx(txParts, isFallback);

	const receipt = await evmWalletHandler.submitTx(tx);

	const amount = BigInt(bridgingFee) + BigInt(values.amount);

	const bindedSubmittedAction = bridgingTransactionSubmittedAction.bind(
		null,
		new TransactionSubmittedDto({
			originChain: values.originChain,
			destinationChain: values.destinationChain,
			originTxHash: receipt.transactionHash.toString().trim(),
			senderAddress: values.senderAddress.trim(),
			receiverAddrs: [values.destinationAddress.trim()],
			txRaw: JSON.stringify(
				{ ...tx, block: receipt.blockNumber.toString() },
				(_: string, value: any) =>
					typeof value === 'bigint'
						? `bigint:${value.toString()}`
						: value,
			),
			amount: amount.toString(),
			isFallback: createResponse.isFallback,
		}),
	);

	const response = await tryCatchJsonByAction(bindedSubmittedAction, false);
	if (response instanceof ErrorResponse) {
		throw new Error(response.err);
	}

	return response;
};

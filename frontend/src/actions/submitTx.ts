import {
	bridgingTransactionActivateAction,
	bridgingTransactionDeleteAction,
	bridgingTransactionSubmittedAction,
	bridgingTransactionSubmittedActivatedAction,
	bridgingTransactionUpdateAction,
} from '../pages/Transactions/action';
import {
	CreateTransactionDto,
	CreateCardanoTransactionResponseDto,
	CreateEthTransactionResponseDto,
	TransactionSubmittedDto,
	TransactionActivateDeleteDto,
	TransactionUpdateDto,
	BridgeTransactionDto,
} from '../swagger/apexBridgeApiService';
import { ErrorResponse, tryCatchJsonByAction } from '../utils/fetchUtils';
import walletHandler from '../features/WalletHandler';
import evmWalletHandler from '../features/EvmWalletHandler';
import { Transaction } from 'web3-types';
import { UpdateSubmitLoadingState } from '../utils/statusUtils';
import { retry, retryForever } from '../utils/generalUtils';

const TX_SUCCESS = BigInt(1);

const blockOffset = BigInt(1000);

const tryCount = 60;

const bigintReplacer = (_: string, value: unknown) =>
	typeof value === 'bigint' ? `bigint:${value}` : value;

export const signAndSubmitCardanoTx = async (
	values: CreateTransactionDto,
	createResponse: CreateCardanoTransactionResponseDto,
	updateLoadingState: (newState: UpdateSubmitLoadingState) => void,
) => {
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

	const transactionSubmittedDto = new TransactionSubmittedDto({
		originChain: values.originChain,
		senderAddress: values.senderAddress,
		destinationChain: values.destinationChain,
		receiverAddrs: [values.destinationAddress],
		amount: amount.toString(),
		originTxHash: createResponse.txHash,
		txRaw: createResponse.txRaw,
		isFallback: createResponse.isFallback,
	});

	const bindedSubmittedAction = bridgingTransactionSubmittedAction.bind(
		null,
		transactionSubmittedDto,
	);

	const [txResult, response] = await Promise.allSettled([
		walletHandler.submitTx(signedTxRaw),
		tryCatchJsonByAction(bindedSubmittedAction, false),
	]);

	updateLoadingState({ content: 'Recording the transaction...' });

	if (txResult.status === 'rejected') {
		if (
			response.status === 'rejected' ||
			response.value instanceof ErrorResponse
		) {
			throw new Error(
				'Wallet submission failed and bridging transaction backend submission failed.',
			);
		}

		const bindedDeleteAction = bridgingTransactionDeleteAction.bind(
			null,
			new TransactionActivateDeleteDto({
				originChain: values.originChain,
				originTxHash: createResponse.txHash,
			}),
		);

		// we dont await on purpose, because we want this to execute in the background, without blocking the user
		void retryForever(async () => {
			const res = await tryCatchJsonByAction(bindedDeleteAction, false);

			if (res instanceof ErrorResponse) {
				throw new Error(res.err ?? 'ErrorResponse');
			}
		});

		throw new Error('Wallet cannot submit the transaction.');
	}

	if (response.status === 'fulfilled') {
		const bindedActivateAction = bridgingTransactionActivateAction.bind(
			null,
			new TransactionActivateDeleteDto({
				originChain: values.originChain,
				originTxHash: createResponse.txHash,
			}),
		);

		if (response.value instanceof ErrorResponse) {
			try {
				const bindedSubmittedActivateAction =
					bridgingTransactionSubmittedActivatedAction.bind(
						null,
						transactionSubmittedDto,
					);
				const submittedResponse = await retry(async () => {
					const res = await tryCatchJsonByAction(
						bindedSubmittedActivateAction,
						false,
					);

					if (res instanceof ErrorResponse) {
						throw new Error(res.err ?? 'ErrorResponse');
					}

					return res;
				}, tryCount);

				return submittedResponse;
			} catch (err) {
				throw new Error(
					'Bridging transaction backend submission failed',
				);
			}
		}

		try {
			const activateResponse = await retry(async () => {
				const res = await tryCatchJsonByAction(
					bindedActivateAction,
					false,
				);

				if (res instanceof ErrorResponse) {
					throw new Error(res.err ?? 'ErrorResponse');
				}

				return res;
			}, tryCount);

			return activateResponse;
		} catch (err) {
			throw new Error('Bridging transaction activation backend failed');
		}
	}
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

	const amount = BigInt(bridgingFee) + BigInt(values.amount);

	const latestBlock = await evmWalletHandler.getBlock();

	updateLoadingState({
		content: 'Signing and submitting the transaction...',
	});

	let submitActionPromise: Promise<
		BridgeTransactionDto | ErrorResponse | void
	> = Promise.resolve();

	const baseSubmittedDto = {
		originChain: values.originChain,
		destinationChain: values.destinationChain,
		senderAddress: values.senderAddress,
		receiverAddrs: [values.destinationAddress],
		amount: amount.toString(10),
		isFallback: createResponse.isFallback,
	};

	const onTxHash = (txHash: any) => {
		updateLoadingState({
			content: 'Waiting for transaction receipt...',
			txHash: txHash.toString(),
		});

		const bindedSubmittedAction = bridgingTransactionSubmittedAction.bind(
			null,
			new TransactionSubmittedDto({
				...baseSubmittedDto,
				originTxHash: txHash.toString(),
				txRaw: JSON.stringify(
					{ ...tx, block: latestBlock.number + blockOffset },
					bigintReplacer,
				),
			}),
		);

		submitActionPromise = tryCatchJsonByAction(
			bindedSubmittedAction,
			false,
		);
	};

	console.log('submitting eth tx...', tx);

	const submitPromise = evmWalletHandler.submitTx(tx);
	submitPromise.on('transactionHash', onTxHash);

	const [response, receipt] = await Promise.all([
		submitActionPromise,
		submitPromise,
	]);

	updateLoadingState({
		content: 'Recording the transaction...',
		txHash: receipt.transactionHash.toString(),
	});

	submitPromise.off('transactionHash', onTxHash);

	if (receipt.status !== TX_SUCCESS) {
		if (response instanceof ErrorResponse) {
			throw new Error(
				'Wallet submission failed and bridging transaction backend submission failed.',
			);
		}

		const bindedDeleteAction = bridgingTransactionDeleteAction.bind(
			null,
			new TransactionActivateDeleteDto({
				originChain: values.originChain,
				originTxHash: receipt.transactionHash.toString(),
			}),
		);

		// we dont await on purpose, because we want this to execute in the background, without blocking the user
		void retryForever(async () => {
			const res = await tryCatchJsonByAction(bindedDeleteAction, false);

			if (res instanceof ErrorResponse) {
				throw new Error(res.err ?? 'ErrorResponse');
			}
		});

		throw new Error('Transaction submission failed');
	}

	if (response instanceof ErrorResponse) {
		try {
			const bindedSubmittedActivatedAction =
				bridgingTransactionSubmittedActivatedAction.bind(
					null,
					new TransactionSubmittedDto({
						...baseSubmittedDto,
						originTxHash: receipt.transactionHash.toString(),
						txRaw: JSON.stringify(
							{ ...tx, block: receipt.blockNumber },
							bigintReplacer,
						),
					}),
				);

			const submittedResponse = await retry(async () => {
				const res = await tryCatchJsonByAction(
					bindedSubmittedActivatedAction,
					false,
				);

				if (res instanceof ErrorResponse) {
					throw new Error(res.err ?? 'ErrorResponse');
				}
			}, tryCount);

			return submittedResponse;
		} catch (err) {
			throw new Error();
		}
	}

	const bindedUpdateAction = bridgingTransactionUpdateAction.bind(
		null,
		new TransactionUpdateDto({
			originChain: values.originChain,
			originTxHash: receipt.transactionHash.toString(),
			txRaw: JSON.stringify(
				{ ...tx, block: receipt.blockNumber.toString() },
				bigintReplacer,
			),
		}),
	);

	try {
		const updateResponse = await retry(async () => {
			const res = await tryCatchJsonByAction(bindedUpdateAction, false);

			if (res instanceof ErrorResponse) {
				throw new Error(res.err ?? 'ErrorResponse');
			}

			return res;
		}, tryCount);

		return updateResponse;
	} catch (err) {
		throw new Error();
	}
};

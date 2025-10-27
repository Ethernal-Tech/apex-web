import BasePage from '../base/BasePage';
import BridgeInput from './components/BridgeInput';
import { convertDfmToWei, formatTxDetailUrl } from '../../utils/generalUtils';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorResponse, tryCatchJsonByAction } from '../../utils/fetchUtils';
import { toast } from 'react-toastify';
import walletHandler from '../../features/WalletHandler';
import {
	createCardanoTransactionAction,
	createEthTransactionAction,
	getCardanoTransactionFeeAction,
} from './action';
import {
	BridgeTransactionDto,
	CardanoTransactionFeeResponseDto,
	CreateEthTransactionResponseDto,
	CreateTransactionDto,
	TxTypeEnum,
} from '../../swagger/apexBridgeApiService';
import {
	getLayerZeroTransferResponse,
	signAndSubmitCardanoTx,
	signAndSubmitEthTx,
	signAndSubmitLayerZeroTx,
} from '../../actions/submitTx';
import {
	CreateCardanoTxResponse,
	CreateEthTxResponse,
} from './components/types';
import NewTransaction from './components/NewTransaction';
import { useNavigate } from 'react-router-dom';
import {
	BridgingModeEnum,
	getBridgingMode,
	isCardanoChain,
	isEvmChain,
	toApexBridge,
} from '../../settings/chain';
import BridgeInputLZ from './components/LayerZeroBridgeInput';
import { validateSubmitTxInputs } from '../../utils/validationUtils';
import {
	SubmitLoadingState,
	UpdateSubmitLoadingState,
} from '../../utils/statusUtils';

function NewTransactionPage() {
	const [loadingState, setLoadingState] = useState<
		SubmitLoadingState | undefined
	>();

	const navigate = useNavigate();
	const chain = useSelector((state: RootState) => state.chain.chain);
	const destinationChain = useSelector(
		(state: RootState) => state.chain.destinationChain,
	);
	const account = useSelector(
		(state: RootState) => state.accountInfo.account,
	);
	const settings = useSelector((state: RootState) => state.settings);

	const bridgingModeInfo = getBridgingMode(chain, destinationChain, settings);
	const { minOperationFee, minChainFeeForBridging } =
		bridgingModeInfo.settings || {
			minOperationFee: {} as { [key: string]: string },
			minChainFeeForBridging: {} as { [key: string]: string },
		};

	const defaultBridgeTxFee = useMemo(
		() =>
			isEvmChain(chain)
				? convertDfmToWei(minChainFeeForBridging[chain] || '0')
				: minChainFeeForBridging[chain] || '0',
		[chain, minChainFeeForBridging],
	);

	const [bridgeTxFee, setBridgeTxFee] = useState<string>(defaultBridgeTxFee);

	useEffect(() => {
		setBridgeTxFee(defaultBridgeTxFee);
	}, [defaultBridgeTxFee]);

	const resetBridgeTxFee = useCallback(() => {
		setBridgeTxFee(defaultBridgeTxFee);
	}, [defaultBridgeTxFee]);

	const operationFee = useMemo(
		() =>
			isEvmChain(chain)
				? convertDfmToWei(minOperationFee[chain] || '0')
				: minOperationFee[chain] || '0',
		[chain, minOperationFee],
	);

	const updateLoadingState = useCallback(
		(newState: UpdateSubmitLoadingState) => {
			setLoadingState(
				(oldState: SubmitLoadingState | undefined) =>
					({
						content: newState?.content || oldState?.content,
						txHash: newState?.txHash || oldState?.txHash,
					}) as SubmitLoadingState,
			);
		},
		[],
	);

	const goToDetails = useCallback(
		(tx: BridgeTransactionDto) => {
			navigate(formatTxDetailUrl(tx));
		},
		[navigate],
	);

	const prepareCreateCardanoTx = useCallback(
		async (
			address: string,
			amount: string,
			isNativeToken = false,
		): Promise<CreateTransactionDto> => {
			await walletHandler.getChangeAddress(); // this line triggers an error if the wallet account has been changed by the user in the meantime

			const destChain = toApexBridge(destinationChain);
			const originChain = toApexBridge(chain);

			return new CreateTransactionDto({
				bridgingFee: '0', // will be set on backend
				operationFee: '0', // will be set on backend
				destinationChain: destChain!,
				originChain: originChain!,
				senderAddress: account,
				destinationAddress: address,
				amount,
				utxoCacheKey: undefined,
				isNativeToken,
			});
		},
		[account, chain, destinationChain],
	);

	const getCardanoTxFee = useCallback(
		async (
			address: string,
			amount: string,
			isNativeToken: boolean,
		): Promise<CardanoTransactionFeeResponseDto> => {
			const createTxDto = await prepareCreateCardanoTx(
				address,
				amount,
				isNativeToken,
			);
			const bindedCreateAction = getCardanoTransactionFeeAction.bind(
				null,
				createTxDto,
			);
			const feeResponse = await tryCatchJsonByAction(
				bindedCreateAction,
				false,
			);
			if (feeResponse instanceof ErrorResponse) {
				throw new Error(feeResponse.err);
			}

			return feeResponse;
		},
		[prepareCreateCardanoTx],
	);

	const createCardanoTx = useCallback(
		async (
			address: string,
			amount: string,
			isNativeToken: boolean,
		): Promise<CreateCardanoTxResponse> => {
			const validationErr = validateSubmitTxInputs(
				chain,
				destinationChain,
				address,
				amount,
				isNativeToken,
				settings,
			);
			if (validationErr) {
				throw new Error(validationErr);
			}

			const createTxDto = await prepareCreateCardanoTx(
				address,
				amount,
				isNativeToken,
			);
			const bindedCreateAction = createCardanoTransactionAction.bind(
				null,
				createTxDto,
			);
			const createResponse = await tryCatchJsonByAction(
				bindedCreateAction,
				false,
			);
			if (createResponse instanceof ErrorResponse) {
				throw new Error(createResponse.err);
			}

			return { createTxDto, createResponse };
		},
		[chain, destinationChain, prepareCreateCardanoTx, settings],
	);

	const prepareCreateEthTx = useCallback(
		(address: string, amount: string): CreateTransactionDto => {
			const destChain = toApexBridge(destinationChain);
			const originChain = toApexBridge(chain);

			return new CreateTransactionDto({
				bridgingFee: '0', // will be set on backend
				operationFee: '0', // will be set on backend
				destinationChain: destChain!,
				originChain: originChain!,
				senderAddress: account,
				destinationAddress: address,
				amount,
				utxoCacheKey: undefined,
				isNativeToken: false,
			});
		},
		[account, chain, destinationChain],
	);

	const getEthTxFee = useCallback(
		async (
			address: string,
			amount: string,
		): Promise<CreateEthTransactionResponseDto> => {
			const createTxDto = prepareCreateEthTx(address, amount);
			const bindedCreateAction = createEthTransactionAction.bind(
				null,
				createTxDto,
			);
			const feeResponse = await tryCatchJsonByAction(
				bindedCreateAction,
				false,
			);
			if (feeResponse instanceof ErrorResponse) {
				throw new Error(feeResponse.err);
			}

			return feeResponse;
		},
		[prepareCreateEthTx],
	);

	const createEthTx = useCallback(
		async (
			address: string,
			amount: string,
		): Promise<CreateEthTxResponse> => {
			const validationErr = validateSubmitTxInputs(
				chain,
				destinationChain,
				address,
				amount,
				false,
				settings,
			);
			if (validationErr) {
				throw new Error(validationErr);
			}

			const createTxDto = prepareCreateEthTx(address, amount);
			const bindedCreateAction = createEthTransactionAction.bind(
				null,
				createTxDto,
			);
			const createResponse = await tryCatchJsonByAction(
				bindedCreateAction,
				false,
			);
			if (createResponse instanceof ErrorResponse) {
				throw new Error(createResponse.err);
			}

			return { createTxDto, createResponse };
		},
		[chain, destinationChain, prepareCreateEthTx, settings],
	);

	const handleSubmitCallback = useCallback(
		async (address: string, amount: string, isNativeToken: boolean) => {
			setLoadingState({
				content: 'Preparing the transaction...',
				txHash: undefined,
			});
			try {
				if (isCardanoChain(chain)) {
					const createTxResp = await createCardanoTx(
						address,
						amount,
						isNativeToken,
					);

					const response = await signAndSubmitCardanoTx(
						createTxResp.createTxDto,
						createTxResp.createResponse,
						updateLoadingState,
					);

					console.log('signed transaction');

					response && goToDetails(response);
				} else if (isEvmChain(chain)) {
					const createTxResp = await createEthTx(address, amount);

					const response = await signAndSubmitEthTx(
						createTxResp.createTxDto,
						createTxResp.createResponse,
						updateLoadingState,
					);

					response && goToDetails(response);
				} else {
					throw new Error(`Unsupported source chain: ${chain}`);
				}
			} catch (err) {
				console.log(err);
				if (
					err instanceof Error &&
					err.message.includes('account changed')
				) {
					toast.error(
						`Wallet account changed. It looks like you switched accounts in your wallet.`,
					);
				} else {
					toast.error(`${err}`);
				}
			} finally {
				setLoadingState(undefined);
			}
		},
		[chain, createCardanoTx, createEthTx, goToDetails, updateLoadingState],
	);

	const handleLZSubmitCallback = useCallback(
		async (toAddress: string, amount: string) => {
			setLoadingState({
				content: 'Preparing the transaction...',
				txHash: undefined,
			});

			try {
				const lzResponse = await getLayerZeroTransferResponse(
					settings,
					chain,
					destinationChain,
					account,
					toAddress,
					amount,
				);
				const response = await signAndSubmitLayerZeroTx(
					account,
					settings.layerZeroChains[chain]?.txType ||
						TxTypeEnum.Legacy,
					toAddress,
					lzResponse,
					updateLoadingState,
				);

				response && goToDetails(response);
			} catch (err) {
				console.log(err);
				if (
					err instanceof Error &&
					err.message.includes('account changed')
				) {
					toast.error(
						`Wallet account changed. It looks like you switched accounts in your wallet.`,
					);
				} else {
					toast.error(`${err}`);
				}
			} finally {
				setLoadingState(undefined);
			}
		},
		[
			settings,
			chain,
			destinationChain,
			account,
			updateLoadingState,
			goToDetails,
		],
	);

	return (
		<BasePage>
			<NewTransaction txInProgress={false}>
				{bridgingModeInfo.bridgingMode ===
				BridgingModeEnum.LayerZero ? (
					<BridgeInputLZ
						bridgeTxFee={bridgeTxFee}
						setBridgeTxFee={setBridgeTxFee}
						resetBridgeTxFee={resetBridgeTxFee}
						submit={handleLZSubmitCallback}
						loadingState={loadingState}
					/>
				) : (
					<BridgeInput
						bridgeTxFee={bridgeTxFee}
						defaultBridgeTxFee={defaultBridgeTxFee}
						setBridgeTxFee={setBridgeTxFee}
						resetBridgeTxFee={resetBridgeTxFee}
						operationFee={operationFee}
						getCardanoTxFee={getCardanoTxFee}
						getEthTxFee={getEthTxFee}
						submit={handleSubmitCallback}
						loadingState={loadingState}
					/>
				)}
			</NewTransaction>
		</BasePage>
	);
}

export default NewTransactionPage;

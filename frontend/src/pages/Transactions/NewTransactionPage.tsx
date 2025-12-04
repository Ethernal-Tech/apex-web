import BasePage from '../base/BasePage';
import BridgeInput from './components/BridgeInput';
import { formatTxDetailUrl } from '../../utils/generalUtils';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { useCallback, useState } from 'react';
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
	CreateEthTransactionFullResponseDto,
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
	isCardanoChain,
	isEvmChain,
	isLZBridging,
	toApexBridge,
} from '../../settings/chain';
import BridgeInputLZ from './components/LayerZeroBridgeInput';
import { validateSubmitTxInputs } from '../../utils/validationUtils';
import {
	SubmitLoadingState,
	UpdateSubmitLoadingState,
} from '../../utils/statusUtils';
import { captureAndThrowError, captureException } from '../../features/sentry';

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

	const isLayerZero = isLZBridging(chain, destinationChain);

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
			tokenID: number,
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
				tokenID,
				utxoCacheKey: undefined,
			});
		},
		[account, chain, destinationChain],
	);

	const getCardanoTxFee = useCallback(
		async (
			address: string,
			amount: string,
			tokenID: number,
		): Promise<CardanoTransactionFeeResponseDto> => {
			const createTxDto = await prepareCreateCardanoTx(
				address,
				amount,
				tokenID,
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
				captureAndThrowError(
					feeResponse.err,
					'NewTransactionPage.tsx',
					'getCardanoTxFee',
				);
			}

			return feeResponse;
		},
		[prepareCreateCardanoTx],
	);

	const createCardanoTx = useCallback(
		async (
			address: string,
			amount: string,
			tokenID: number,
		): Promise<CreateCardanoTxResponse> => {
			const validationErr = validateSubmitTxInputs(
				settings,
				chain,
				destinationChain,
				address,
				amount,
				tokenID,
			);
			if (validationErr) {
				captureAndThrowError(
					validationErr,
					'NewTransactionPage.tsx',
					'createCardanoTx',
				);
			}

			const createTxDto = await prepareCreateCardanoTx(
				address,
				amount,
				tokenID,
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
				captureAndThrowError(
					createResponse.err,
					'NewTransactionPage.tsx',
					'createCardanoTx',
				);
			}

			return { createTxDto, createResponse };
		},
		[chain, destinationChain, prepareCreateCardanoTx, settings],
	);

	const prepareCreateEthTx = useCallback(
		(
			address: string,
			amount: string,
			tokenID: number,
		): CreateTransactionDto => {
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
				tokenID,
				utxoCacheKey: undefined,
			});
		},
		[account, chain, destinationChain],
	);

	const getEthTxFee = useCallback(
		async (
			address: string,
			amount: string,
			tokenID: number,
		): Promise<CreateEthTransactionFullResponseDto> => {
			const createTxDto = prepareCreateEthTx(address, amount, tokenID);
			const bindedCreateAction = createEthTransactionAction.bind(
				null,
				createTxDto,
			);
			const feeResponse = await tryCatchJsonByAction(
				bindedCreateAction,
				false,
			);
			if (feeResponse instanceof ErrorResponse) {
				captureAndThrowError(
					feeResponse.err,
					'NewTransactionPage.tsx',
					'getEthTxFee',
				);
			}

			return feeResponse;
		},
		[prepareCreateEthTx],
	);

	const createEthTx = useCallback(
		async (
			address: string,
			amount: string,
			tokenID: number,
		): Promise<CreateEthTxResponse> => {
			const validationErr = validateSubmitTxInputs(
				settings,
				chain,
				destinationChain,
				address,
				amount,
				tokenID,
			);
			if (validationErr) {
				captureAndThrowError(
					validationErr,
					'NewTransactionPage.tsx',
					'createEthTx',
				);
			}

			const createTxDto = prepareCreateEthTx(address, amount, tokenID);
			const bindedCreateAction = createEthTransactionAction.bind(
				null,
				createTxDto,
			);
			const createResponse = await tryCatchJsonByAction(
				bindedCreateAction,
				false,
			);
			if (createResponse instanceof ErrorResponse) {
				captureAndThrowError(
					createResponse.err,
					'NewTransactionPage.tsx',
					'createEthTx',
				);
			}

			return { createTxDto, createResponse };
		},
		[chain, destinationChain, prepareCreateEthTx, settings],
	);

	const handleSubmitCallback = useCallback(
		async (address: string, amount: string, tokenID: number) => {
			setLoadingState({
				content: 'Preparing the transaction...',
				txHash: undefined,
			});
			try {
				if (isCardanoChain(chain)) {
					const createTxResp = await createCardanoTx(
						address,
						amount,
						tokenID,
					);

					const response = await signAndSubmitCardanoTx(
						createTxResp.createTxDto,
						createTxResp.createResponse,
						updateLoadingState,
					);

					console.log('signed transaction');

					response && goToDetails(response);
				} else if (isEvmChain(chain)) {
					const createTxResp = await createEthTx(
						address,
						amount,
						tokenID,
					);

					const response = await signAndSubmitEthTx(
						createTxResp.createTxDto,
						createTxResp.createResponse,
						updateLoadingState,
					);

					response && goToDetails(response);
				} else {
					captureAndThrowError(
						`Unsupported source chain: ${chain}`,
						'NewTransactionPage.tsx',
						'handleSubmitCallback',
					);
				}
			} catch (err) {
				console.log(err);
				captureException(err, {
					tags: {
						component: 'NewTransactionPage.ts',
						action: 'handleSubmitCallback',
					},
				});
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
		async (toAddress: string, amount: string, tokenID: number) => {
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
					tokenID,
				);
				const response = await signAndSubmitLayerZeroTx(
					settings,
					account,
					settings.layerZeroChains[chain]?.txType ||
						TxTypeEnum.Legacy,
					toAddress,
					lzResponse,
					tokenID,
					updateLoadingState,
				);

				response && goToDetails(response);
			} catch (err) {
				console.log(err);
				captureException(err, {
					tags: {
						component: 'NewTransactionPage.ts',
						action: 'handleLZSubmitCallback',
					},
				});
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
				{isLayerZero ? (
					<BridgeInputLZ
						submit={handleLZSubmitCallback}
						loadingState={loadingState}
					/>
				) : (
					<BridgeInput
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

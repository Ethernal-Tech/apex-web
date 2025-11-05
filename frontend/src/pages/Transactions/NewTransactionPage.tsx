import BasePage from '../base/BasePage';
import BridgeInput from './components/BridgeInput';
import {
	convertDfmToWei,
	formatTxDetailUrl,
	validateSubmitTxInputs,
} from '../../utils/generalUtils';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { useCallback, useState } from 'react';
import { ErrorResponse, tryCatchJsonByAction } from '../../utils/fetchUtils';
import { toast } from 'react-toastify';
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
} from '../../swagger/apexBridgeApiService';
import {
	signAndSubmitCardanoTx,
	signAndSubmitEthTx,
} from '../../actions/submitTx';
import {
	CreateCardanoTxResponse,
	CreateEthTxResponse,
} from './components/types';
import NewTransaction from './components/NewTransaction';
import { useNavigate } from 'react-router-dom';
import walletHandler from '../../features/WalletHandler';
import evmWalletHandler from '../../features/EvmWalletHandler';
import {
	fromEvmNetworkIdToNetwork,
	fromChainToNetworkId,
	checkChainCompatibility,
	fromChainToNetwork,
} from '../../utils/chainUtils';
import { isCardanoChain, isEvmChain } from '../../settings/chain';
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

	// conditionally implementing bridgeTxFee depending on selected network
	const bridgeTxFee = isEvmChain(chain)
		? convertDfmToWei(settings.minChainFeeForBridging[chain])
		: settings.minChainFeeForBridging[chain];

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
		): Promise<CreateTransactionDto> => {
			await walletHandler.getChangeAddress(); // this line triggers an error if the wallet account has been changed by the user in the meantime

			const validationErr = validateSubmitTxInputs(
				settings,
				chain,
				destinationChain,
				address,
				amount,
			);
			if (validationErr) {
				throw new Error(validationErr);
			}

			return new CreateTransactionDto({
				bridgingFee: `${bridgeTxFee}`,
				destinationChain,
				originChain: chain,
				senderAddress: account,
				destinationAddress: address,
				amount,
				utxoCacheKey: undefined,
			});
		},
		[account, bridgeTxFee, chain, destinationChain, settings],
	);

	const getCardanoTxFee = useCallback(
		async (
			address: string,
			amount: string,
		): Promise<CardanoTransactionFeeResponseDto> => {
			const createTxDto = await prepareCreateCardanoTx(address, amount);
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
		): Promise<CreateCardanoTxResponse> => {
			const createTxDto = await prepareCreateCardanoTx(address, amount);
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
		[prepareCreateCardanoTx],
	);

	const prepareCreateEthTx = useCallback(
		async (
			address: string,
			amount: string,
		): Promise<CreateTransactionDto> => {
			const networkId = await evmWalletHandler.getNetworkId();
			const network = fromEvmNetworkIdToNetwork(networkId);

			if (!network) {
				throw new Error(
					`Invalid networkId: ${networkId}. Expected networkId: ${fromChainToNetworkId(chain)}. Please select network with networkId: ${fromChainToNetworkId(chain)} in your wallet.`,
				);
			}

			if (!checkChainCompatibility(chain, network, networkId)) {
				throw new Error(
					`Oops! You're connected to the wrong network. You're currently on ${network}, but this feature only works with ${fromChainToNetwork(chain)}. Please switch your wallet to ${fromChainToNetwork(chain)} and try again.`,
				);
			}

			const validationErr = validateSubmitTxInputs(
				settings,
				chain,
				destinationChain,
				address,
				amount,
			);
			if (validationErr) {
				throw new Error(validationErr);
			}

			return new CreateTransactionDto({
				bridgingFee: `${bridgeTxFee}`,
				destinationChain,
				originChain: chain,
				senderAddress: account,
				destinationAddress: address,
				amount,
				utxoCacheKey: undefined,
			});
		},
		[account, bridgeTxFee, chain, destinationChain, settings],
	);

	const getEthTxFee = useCallback(
		async (
			address: string,
			amount: string,
		): Promise<CreateEthTransactionResponseDto> => {
			const createTxDto = await prepareCreateEthTx(address, amount);
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
			const createTxDto = await prepareCreateEthTx(address, amount);
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
		[prepareCreateEthTx],
	);

	const handleSubmitCallback = useCallback(
		async (address: string, amount: string) => {
			setLoadingState({
				content: 'Preparing the transaction...',
				txHash: undefined,
			});
			try {
				if (isCardanoChain(chain)) {
					const createTxResp = await createCardanoTx(address, amount);

					const response = await signAndSubmitCardanoTx(
						createTxResp.createTxDto,
						createTxResp.createResponse,
						updateLoadingState,
					);

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

	return (
		<BasePage>
			<NewTransaction txInProgress={false}>
				<BridgeInput
					bridgeTxFee={bridgeTxFee}
					getCardanoTxFee={getCardanoTxFee}
					getEthTxFee={getEthTxFee}
					submit={handleSubmitCallback}
					loadingState={loadingState}
				/>
			</NewTransaction>
		</BasePage>
	);
}

export default NewTransactionPage;

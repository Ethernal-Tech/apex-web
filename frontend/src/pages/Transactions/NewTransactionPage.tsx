import BasePage from "../base/BasePage";
import BridgeInput from "./components/BridgeInput";
import { convertDfmToWei, formatTxDetailUrl, validateSubmitTxInputs } from "../../utils/generalUtils";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { useCallback, useState } from "react";
import { ErrorResponse, tryCatchJsonByAction } from "../../utils/fetchUtils";
import { toast } from "react-toastify";
import { createCardanoTransactionAction, createEthTransactionAction, getCardanoTransactionFeeAction } from "./action";
import { BridgeTransactionDto, CardanoTransactionFeeResponseDto, ChainEnum, CreateEthTransactionResponseDto, CreateTransactionDto } from "../../swagger/apexBridgeApiService";
import { signAndSubmitCardanoTx, signAndSubmitEthTx } from "../../actions/submitTx";
import { CreateCardanoTxResponse, CreateEthTxResponse } from "./components/types";
import NewTransaction from "./components/NewTransaction";
import { useNavigate } from "react-router-dom";

function NewTransactionPage() {	
	const [loading, setLoading] = useState(false);
	
    const navigate = useNavigate();
	const chain = useSelector((state: RootState)=> state.chain.chain);
	const destinationChain = useSelector((state: RootState)=> state.chain.destinationChain);
	const account = useSelector((state: RootState) => state.accountInfo.account);
	const settings = useSelector((state: RootState) => state.settings);

	// conditionally implementing bridgeTxFee depending on selected network
	const bridgeTxFee = chain === ChainEnum.Nexus ? 
		convertDfmToWei(settings.minChainFeeForBridging[ChainEnum.Nexus]) : settings.minChainFeeForBridging[chain];

	const goToDetails = useCallback((tx: BridgeTransactionDto) => {
		navigate(formatTxDetailUrl(tx));
	}, [navigate]);

	const prepareCreateCardanoTx = useCallback((address: string, amount: string): CreateTransactionDto => {
		const validationErr = validateSubmitTxInputs(settings, chain, destinationChain, address, amount, bridgeTxFee);
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
		})
	}, [account, bridgeTxFee, chain, destinationChain, settings])

	const getCardanoTxFee = useCallback(async (address: string, amount: string): Promise<CardanoTransactionFeeResponseDto> => {
		const createTxDto = prepareCreateCardanoTx(address, amount);
		const bindedCreateAction = getCardanoTransactionFeeAction.bind(null, createTxDto);
		const feeResponse = await tryCatchJsonByAction(bindedCreateAction);
		if (feeResponse instanceof ErrorResponse) {
			throw new Error(feeResponse.err)
		}

		return feeResponse;
	}, [prepareCreateCardanoTx])

	const createCardanoTx = useCallback(async (address: string, amount: string): Promise<CreateCardanoTxResponse> => {
		const createTxDto = prepareCreateCardanoTx(address, amount);
		const bindedCreateAction = createCardanoTransactionAction.bind(null, createTxDto);
		const createResponse = await tryCatchJsonByAction(bindedCreateAction, false);
		if (createResponse instanceof ErrorResponse) {
			throw new Error(createResponse.err)
		}

		return { createTxDto, createResponse };
	}, [prepareCreateCardanoTx])

	const prepareCreateEthTx = useCallback((address: string, amount: string): CreateTransactionDto => {
		const validationErr = validateSubmitTxInputs(settings, chain, destinationChain, address, amount, bridgeTxFee);
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
		})
	}, [account, bridgeTxFee, chain, destinationChain, settings])

	const getEthTxFee = useCallback(async (address: string, amount: string): Promise<CreateEthTransactionResponseDto> => {
		const createTxDto = prepareCreateEthTx(address, amount);
		const bindedCreateAction = createEthTransactionAction.bind(null, createTxDto);
		const feeResponse = await tryCatchJsonByAction(bindedCreateAction);
		if (feeResponse instanceof ErrorResponse) {
			throw new Error(feeResponse.err)
		}

		return feeResponse;
	}, [prepareCreateEthTx])

	const createEthTx = useCallback(async (address: string, amount: string): Promise<CreateEthTxResponse> => {
		const createTxDto = prepareCreateEthTx(address, amount);
		const bindedCreateAction = createEthTransactionAction.bind(null, createTxDto);
		const createResponse = await tryCatchJsonByAction(bindedCreateAction, false);
		if (createResponse instanceof ErrorResponse) {
			throw new Error(createResponse.err)
		}

		return { createTxDto, createResponse };
	}, [prepareCreateEthTx])

	const handleSubmitCallback = useCallback(
		async (address: string, amount: string) => {
			setLoading(true);
			try {
				if (chain === ChainEnum.Prime || chain === ChainEnum.Vector) {
					const createTxResp = await createCardanoTx(address, amount);
					
					const response = await signAndSubmitCardanoTx(
						createTxResp.createTxDto,
						createTxResp.createResponse,
					);
					
					response && goToDetails(response);
				} else if (chain === ChainEnum.Nexus) {
					const createTxResp = await createEthTx(address, amount);
					
					const response = await signAndSubmitEthTx(
						createTxResp.createTxDto,
						createTxResp.createResponse,
					);
					
					response && goToDetails(response);
				} else {
					throw new Error(`Unsupported source chain: ${chain}`);
				}
			}catch(err) {
				console.log(err);
				toast.error(`${err}`)
			} finally {
				setLoading(false);
			}
		},
		[chain, createCardanoTx, createEthTx, goToDetails],
	);

	return (
		<BasePage>
			<NewTransaction txInProgress={false}>
				<BridgeInput
					bridgeTxFee={bridgeTxFee}
					getCardanoTxFee={getCardanoTxFee}
					getEthTxFee={getEthTxFee}
					submit={handleSubmitCallback}
					loading={loading}
				/>
			</NewTransaction>
		</BasePage>
	)
}

export default NewTransactionPage;

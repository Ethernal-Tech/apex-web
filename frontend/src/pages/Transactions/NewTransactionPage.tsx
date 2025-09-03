import BasePage from "../base/BasePage";
import BridgeInput from "./components/BridgeInput";
import { convertDfmToWei, formatTxDetailUrl, validateSubmitTxInputs, validateSubmitTxInputsSkyline} from "../../utils/generalUtils";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ErrorResponse, tryCatchJsonByAction } from "../../utils/fetchUtils";
import { toast } from "react-toastify";
import walletHandler from '../../features/WalletHandler';
import { createCardanoTransactionAction, createEthTransactionAction, getCardanoTransactionFeeAction, layerZeroTransferAction } from "./action";
import { BridgeTransactionDto, CardanoTransactionFeeResponseDto, CreateEthTransactionResponseDto, CreateTransactionDto, LayerZeroTransactionDto } from "../../swagger/apexBridgeApiService";
import { signAndSubmitCardanoTx, signAndSubmitEthTx, signAndSubmitLayerZeroTx } from "../../actions/submitTx";
import { CreateCardanoTxResponse, CreateEthTxResponse } from "./components/types";
import appSettings from "../../settings/appSettings";
import NewTransaction from "./components/NewTransaction";
import { useNavigate } from "react-router-dom";
import { isCardanoChain, isEvmChain, toApexBridge } from "../../settings/chain";
import BridgeInputLZ from "./components/LayerZeroBridgeInput";
import { getBridgingInfo, isWrappedToken } from "../../settings/token";

function NewTransactionPage() {	
	const [loading, setLoading] = useState(false);
	
	const navigate = useNavigate();
	const chain = useSelector((state: RootState)=> state.chain.chain);
	const destinationChain = useSelector((state: RootState)=> state.chain.destinationChain);
	const account = useSelector((state: RootState) => state.accountInfo.account);
	const settings = useSelector((state: RootState) => state.settings);
	const { minOperationFee, minChainFeeForBridging }  = useSelector((state: RootState) => state.settings);

	const defaultBridgeTxFee = useMemo(() => isEvmChain(chain)
		? convertDfmToWei(minChainFeeForBridging[chain] || '0')
		: minChainFeeForBridging[chain] || '0', [chain, minChainFeeForBridging])
		
	const [bridgeTxFee, setBridgeTxFee] = useState<string>(defaultBridgeTxFee)

	useEffect(() => {
		setBridgeTxFee(defaultBridgeTxFee)
	}, [defaultBridgeTxFee])

	const resetBridgeTxFee = useCallback(() => {
		setBridgeTxFee(defaultBridgeTxFee)
	}, [defaultBridgeTxFee])

	const operationFee = useMemo(
		() => isEvmChain(chain)
			? convertDfmToWei(minOperationFee[chain] || '0')
			: minOperationFee[chain] || '0',
		[chain, minOperationFee],
	)

	const goToDetails = useCallback((tx: BridgeTransactionDto) => {
		navigate(formatTxDetailUrl(tx));
	}, [navigate]);

	const prepareCreateCardanoTx = useCallback(async(address: string, amount: string, isNativeToken: boolean = false): Promise<CreateTransactionDto> => {
    	await walletHandler.getChangeAddress(); // this line triggers an error if the wallet account has been changed by the user in the meantime

		const destChain = toApexBridge(destinationChain)
		const originChain = toApexBridge(chain)

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
		})
	}, [account, chain, destinationChain])

	const getCardanoTxFee = useCallback(async (address: string, amount: string, isNativeToken: boolean): Promise<CardanoTransactionFeeResponseDto> => {
		const createTxDto = await prepareCreateCardanoTx(address, amount, isNativeToken);
		const bindedCreateAction = getCardanoTransactionFeeAction.bind(null, createTxDto);
		const feeResponse = await tryCatchJsonByAction(bindedCreateAction, false);
		if (feeResponse instanceof ErrorResponse) {
			throw new Error(feeResponse.err)
		}

		return feeResponse;
	}, [prepareCreateCardanoTx])

	const createCardanoTx = useCallback(async (address: string, amount: string, isNativeToken: boolean): Promise<CreateCardanoTxResponse> => {
		const validationErr = appSettings.isSkyline
			? validateSubmitTxInputsSkyline(settings, chain, destinationChain, address, amount, bridgeTxFee, operationFee, isNativeToken) 
			: validateSubmitTxInputs(settings, chain, destinationChain, address, amount);
		if (validationErr) {
			throw new Error(validationErr);
		}

		const createTxDto =  await prepareCreateCardanoTx(address, amount, isNativeToken);
		const bindedCreateAction = createCardanoTransactionAction.bind(null, createTxDto);
		const createResponse = await tryCatchJsonByAction(bindedCreateAction, false);
		if (createResponse instanceof ErrorResponse) {
			throw new Error(createResponse.err)
		}

		return { createTxDto, createResponse };
	}, [bridgeTxFee, chain, destinationChain, operationFee, prepareCreateCardanoTx, settings])

	const prepareCreateEthTx = useCallback((address: string, amount: string): CreateTransactionDto => {
		const destChain = toApexBridge(destinationChain)
		const originChain = toApexBridge(chain)

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
		})
	}, [account, chain, destinationChain])

	const getEthTxFee = useCallback(async (address: string, amount: string): Promise<CreateEthTransactionResponseDto> => {
		const createTxDto = prepareCreateEthTx(address, amount);
		const bindedCreateAction = createEthTransactionAction.bind(null, createTxDto);
		const feeResponse = await tryCatchJsonByAction(bindedCreateAction, false);
		if (feeResponse instanceof ErrorResponse) {
			throw new Error(feeResponse.err)
		}

		return feeResponse;
	}, [prepareCreateEthTx])

	const createEthTx = useCallback(async (address: string, amount: string): Promise<CreateEthTxResponse> => {
		const validationErr = validateSubmitTxInputs(settings, chain, destinationChain, address, amount);
		if (validationErr) {
			throw new Error(validationErr);
		}

		const createTxDto = prepareCreateEthTx(address, amount);
		const bindedCreateAction = createEthTransactionAction.bind(null, createTxDto);
		const createResponse = await tryCatchJsonByAction(bindedCreateAction, false);
		if (createResponse instanceof ErrorResponse) {
			throw new Error(createResponse.err)
		}

		return { createTxDto, createResponse };
	}, [bridgeTxFee, chain, destinationChain, prepareCreateEthTx, settings])

	const createLayerZeroTx = useCallback(async (address: string, amount: string): Promise<any> => {
		const validationErr = validateSubmitTxInputs(settings, chain, destinationChain, address, amount) 
		if (validationErr) {
			throw new Error(validationErr);
		}

		const originChainSetting = settings.layerZeroChains[chain];
		
		if (!originChainSetting) throw new Error(`No LayerZero config for ${chain}`);
		
		const createTxDto = new LayerZeroTransactionDto({
			srcChainName: chain,
			dstChainName: destinationChain,
			oftAddress: originChainSetting.oftAddress,
    		from: account,
    		to: address,
    		validate: true,
			amount: amount,			
		});

		const bindedCreateAction = layerZeroTransferAction.bind(null, createTxDto);
		const createResponse = await tryCatchJsonByAction(bindedCreateAction, false);
		if (createResponse instanceof ErrorResponse) {
			throw new Error(createResponse.err)
		}

		return createResponse;
	}, [bridgeTxFee, chain, destinationChain, operationFee, settings])

	const handleSubmitCallback = useCallback(
		async (address: string, amount: string, isNativeToken: boolean) => {
			setLoading(true);
			try {
				if (isCardanoChain(chain)) {
					const createTxResp = await createCardanoTx(address, amount, isNativeToken);
					
					const response = await signAndSubmitCardanoTx(
						createTxResp.createTxDto,
						createTxResp.createResponse,
					);

					console.log("signed transaction");
					
					response && goToDetails(response);
				} else if (isEvmChain(chain)) {
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
				if (err instanceof Error && err.message.includes('account changed')) {
					toast.error(`Wallet account changed. It looks like you switched accounts in your wallet.`)
				} else {
					toast.error(`${err}`)
				}
			} finally {
				setLoading(false);
			}
		},
		[chain, createCardanoTx, createEthTx, goToDetails],
	);

	const handleLZSubmitCallback = useCallback(
		async(address: string, amount: string) =>{
			setLoading(true);
			try{
				if (isEvmChain(chain)){
					const bridgingInfo = getBridgingInfo(chain, destinationChain);

					if (isWrappedToken(bridgingInfo.wrappedToken)){
						const createTxResp = await createLayerZeroTx(address, amount);

						const response = await signAndSubmitLayerZeroTx(createTxResp);

						response && goToDetails(response);
					}else{

					}
				}else{
					throw new Error(`Unsupported source chain: ${chain}`);
				}
			}
			catch(err){
				console.log(err);
				if (err instanceof Error && err.message.includes('account changed')) {
					toast.error(`Wallet account changed. It looks like you switched accounts in your wallet.`)
				} else {
					toast.error(`${err}`)
				}
			} finally{
				setLoading(false);
			}
		},[chain, createLayerZeroTx, goToDetails]
	)

	return (
<BasePage>
  <NewTransaction txInProgress={false}>
    {isEvmChain(chain) ? (
      <BridgeInputLZ
        bridgeTxFee={bridgeTxFee}
		setBridgeTxFee={setBridgeTxFee}
        operationFee={operationFee}
		resetBridgeTxFee={resetBridgeTxFee}
		getEthTxFee={getEthTxFee}
        submit={handleLZSubmitCallback}
        loading={loading}
      />
    ) : (
      <BridgeInput
        bridgeTxFee={bridgeTxFee}
        setBridgeTxFee={setBridgeTxFee}
        resetBridgeTxFee={resetBridgeTxFee}
        operationFee={operationFee}
        getCardanoTxFee={getCardanoTxFee}
        getEthTxFee={getEthTxFee}
        submit={handleSubmitCallback}
        loading={loading}
      />
    )}
  </NewTransaction>
</BasePage>
	)
}

export default NewTransactionPage;

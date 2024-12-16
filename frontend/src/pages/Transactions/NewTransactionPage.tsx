import { Box, Typography } from "@mui/material";
import BasePage from "../base/BasePage";
import AddressBalance from "./components/AddressBalance";
import TotalBalance from "./components/TotalBalance";
import TransferProgress from "./components/TransferProgress";
import BridgeInput from "./components/BridgeInput";
import { chainIcons, convertDfmToWei, validateSubmitTxInputs } from "../../utils/generalUtils";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { useCallback, useState } from "react";
import { ErrorResponse, tryCatchJsonByAction } from "../../utils/fetchUtils";
import { toast } from "react-toastify";
import { createCardanoTransactionAction, createEthTransactionAction, getCardanoTransactionFeeAction } from "./action";
import { BridgeTransactionDto, CardanoTransactionFeeResponseDto, ChainEnum, CreateEthTransactionResponseDto, CreateTransactionDto } from "../../swagger/apexBridgeApiService";
import { signAndSubmitCardanoTx, signAndSubmitEthTx } from "../../actions/submitTx";
import { CreateCardanoTxResponse, CreateEthTxResponse } from "./components/types";

function NewTransactionPage() {
	const [txInProgress, setTxInProgress] = useState<BridgeTransactionDto | undefined>();

	const [loading, setLoading] = useState(false);
	
	const chain = useSelector((state: RootState)=> state.chain.chain);
	const destinationChain = useSelector((state: RootState)=> state.chain.destinationChain);
	const account = useSelector((state: RootState) => state.accountInfo.account);
	const settings = useSelector((state: RootState) => state.settings);

	// conditionally implementing bridgeTxFee depending on selected network
	const bridgeTxFee = chain === ChainEnum.Nexus ? 
		convertDfmToWei(settings.minChainFeeForBridging[ChainEnum.Nexus]) : settings.minChainFeeForBridging[chain];

	const SourceIcon = chainIcons[chain];
	const DestinationIcon = chainIcons[destinationChain];

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
					
					response && setTxInProgress(response);
				} else if (chain === ChainEnum.Nexus) {
					const createTxResp = await createEthTx(address, amount);
					
					const response = await signAndSubmitEthTx(
						createTxResp.createTxDto,
						createTxResp.createResponse,
					);
					
					response && setTxInProgress(response);
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
		[chain, createCardanoTx, createEthTx],
	);

	const tabletMediaQuery = '@media (max-width:800px)'

	return (
		<BasePage>
			
			<Box width={'100%'} sx={{
				display:'grid',
				gridTemplateColumns:'repeat(6,1fr)', 
				gap:'24px',
			}}>
				<Box sx={{ 
					gridColumn:'span 2', 
					color:'white', 
					textTransform:'capitalize',
					[tabletMediaQuery]:{
						gridColumn:'span 3'
						}
					}}>
					<Typography>Source</Typography>
					<Box sx={{display:'flex', alignItems:'center'}}>
						<SourceIcon width={'40px'} height={'40px'}/>
						<Typography fontSize={'27px'} sx={{marginLeft:'10px', marginTop:'15px'}} fontWeight={500}>
							{chain}
						</Typography>
					</Box>
				</Box>

				<Box sx={{ 
					gridColumn:'span 4', 
					color:'white', 
					textTransform:'capitalize',
					[tabletMediaQuery]:{
						gridColumn:'span 3'
					}
				}}>
					<Typography>Destination</Typography>
					<Box sx={{display:'flex', alignItems:'center'}}>
						<DestinationIcon width={'40px'} height={'40px'}/>
						<Typography fontSize={'27px'} sx={{marginLeft:'10px', marginTop:'15px'}} fontWeight={500}>
							{destinationChain}
						</Typography>
					</Box>
				</Box>

				{/* left side */}
				<Box sx={{
					gridColumn:'span 2', 
					borderTop:`2px solid ${chain === ChainEnum.Prime ? '#077368' : '#F25041'}`,
					p:2,
					background: 'linear-gradient(180deg, #052531 57.87%, rgba(5, 37, 49, 0.936668) 63.14%, rgba(5, 37, 49, 0.1) 132.68%)',
					[tabletMediaQuery]:{
						gridColumn:'span 6'
					}
				}}>
					<TotalBalance/>
					
					<Typography sx={{color:'white',mt:4, mb:2}}>Address</Typography>
					<AddressBalance/>
					
				</Box>
				
				{/* right side */}
				<Box sx={{
					gridColumn:'span 4', 
					borderTop:`2px solid ${destinationChain === ChainEnum.Prime ? '#077368' : '#F25041'}`,
					p:2,
					background: 'linear-gradient(180deg, #052531 57.87%, rgba(5, 37, 49, 0.936668) 63.14%, rgba(5, 37, 49, 0.1) 132.68%)',
					[tabletMediaQuery]:{
						gridColumn:'span 6'
					}
				}}>
					{/* conditional display of right side element */}
					{!txInProgress &&
						<BridgeInput
							bridgeTxFee={bridgeTxFee}
							getCardanoTxFee={getCardanoTxFee}
							getEthTxFee={getEthTxFee}
							submit={handleSubmitCallback}
							loading={loading}
						/>
					}

					{txInProgress && <TransferProgress tx={txInProgress} setTx={setTxInProgress}/>}
				</Box>
			</Box>
		</BasePage>
	)
}

export default NewTransactionPage;

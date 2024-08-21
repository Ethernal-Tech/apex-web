import { Box, Typography } from "@mui/material";
import BasePage from "../base/BasePage";
import AddressBalance from "./components/AddressBalance";
import TotalBalance from "./components/TotalBalance";
import TransferProgress from "./components/TransferProgress";
import BridgeInput from "./components/BridgeInput";
import { chainIcons, validateSubmitTxInputs } from "../../utils/generalUtils";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { useCallback, useState } from "react";
import { useTryCatchJsonByAction } from "../../utils/fetchUtils";
import { toast } from "react-toastify";
import { createCardanoTransactionAction, createEthTransactionAction } from "./action";
import { BridgeTransactionDto, ChainEnum, CreateTransactionDto } from "../../swagger/apexBridgeApiService";
import appSettings from "../../settings/appSettings";
import { signAndSubmitCardanoTx, signAndSubmitEthTx } from "../../actions/submitTx";
import { CreateCardanoTxResponse, CreateEthTxResponse } from "./components/types";

function NewTransactionPage() {
	const [txInProgress, setTxInProgress] = useState<BridgeTransactionDto | undefined>();

	const [loading, setLoading] = useState(false);
	
	const chain = useSelector((state: RootState)=> state.chain.chain);
	const destinationChain = useSelector((state: RootState)=> state.chain.destinationChain);
	const account = useSelector((state: RootState) => state.accountInfo.account);


	// conditionally implementing bridgeTxFee depending on selected network
	const bridgeTxFee = chain === ChainEnum.Nexus ? 
		appSettings.nexusBridgingFee : appSettings.primeVectorBridgingFee;

	const SourceIcon = chainIcons[chain];
	const DestinationIcon = chainIcons[destinationChain];

	const dispatch = useDispatch();
	const fetchFunction = useTryCatchJsonByAction();

	const createCardanoTx = useCallback(async (address: string, amount: string): Promise<CreateCardanoTxResponse> => {
		const validationErr = validateSubmitTxInputs(chain, destinationChain, address, amount);
		if (validationErr) {
			throw new Error(validationErr);
		}

		const createTxDto = new CreateTransactionDto({
			bridgingFee: `${bridgeTxFee}`,
			destinationChain,
			originChain: chain,
			senderAddress: account,
			destinationAddress: address,
			amount,
		})
		const bindedCreateAction = createCardanoTransactionAction.bind(null, createTxDto);
		const createResponse = await fetchFunction(bindedCreateAction);

		return { createTxDto, createResponse };
	}, [bridgeTxFee, chain, destinationChain, fetchFunction, account])

	const createEthTx = useCallback(async (address: string, amount: string): Promise<CreateEthTxResponse> => {
		const validationErr = validateSubmitTxInputs(chain, destinationChain, address, amount);
		if (validationErr) {
			throw new Error(validationErr);
		}

		const createTxDto = new CreateTransactionDto({
			bridgingFee: `${bridgeTxFee}`,
			destinationChain,
			originChain: chain,
			senderAddress: account,
			destinationAddress: address,
			amount,
		})
		const bindedCreateAction = createEthTransactionAction.bind(null, createTxDto);
		const createResponse = await fetchFunction(bindedCreateAction);

		return { createTxDto, createResponse };
	}, [bridgeTxFee, chain, destinationChain, fetchFunction, account])

	const handleSubmitCallback = useCallback(
		async (address: string, amount: string) => {
			setLoading(true);
			try {
				if (chain === ChainEnum.Prime || chain === ChainEnum.Vector) {
					const createTxResp = await createCardanoTx(address, amount);
					
					const response = await signAndSubmitCardanoTx(
						createTxResp.createTxDto,
						createTxResp.createResponse,
						dispatch,
					);
					
					response && setTxInProgress(response);
				} else if (chain === ChainEnum.Nexus) {
					const createTxResp = await createEthTx(address, amount);
					
					const response = await signAndSubmitEthTx(
						createTxResp.createTxDto,
						createTxResp.createResponse,
						dispatch,
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
		[chain, createCardanoTx, createEthTx, dispatch],
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
							createCardanoTx={createCardanoTx}
							createEthTx={createEthTx}
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

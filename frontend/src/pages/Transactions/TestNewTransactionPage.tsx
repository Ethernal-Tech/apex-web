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
import { createTransactionAction } from "./action";
import { BridgeTransactionDto, ChainEnum, CreateTransactionDto, CreateTransactionReceiverDto, TransactionStatusEnum } from "../../swagger/apexBridgeApiService";
import appSettings from "../../settings/appSettings";
import { signAndSubmitTx } from "../../actions/submitTx";
import { CreateTxResponse } from "./components/types";

// TODO: add input validations
function NewTransactionPage() {
	const [txInProgress, setTxInProgress] = useState<BridgeTransactionDto | undefined>();
	const [loading, setLoading] = useState(false);
	
	const {chain, destinationChain} = useSelector((state: RootState)=> state.chain);
	const accountInfoState = useSelector((state: RootState) => state.accountInfo);

	const bridgeTxFee = appSettings.bridgingFee;

	// TODO - update these to check for nexus when implemented
	const SourceIcon = chain === 'prime' ? chainIcons.prime : chainIcons.vector;
	const DestinationIcon = destinationChain === 'prime' ? chainIcons.prime : chainIcons.vector;

	const dispatch = useDispatch();
	const fetchFunction = useTryCatchJsonByAction();

	const createTx = useCallback(async (address: string, amount: number): Promise<CreateTxResponse> => {
		const validationErr = validateSubmitTxInputs(destinationChain, address, amount);
		if (validationErr) {
			throw new Error(validationErr);
		}

		const createTxDto = new CreateTransactionDto({
			bridgingFee: bridgeTxFee,
			destinationChain,
			originChain: chain,
			senderAddress: accountInfoState.account,
			receivers: [new CreateTransactionReceiverDto({
				address, amount,
			})]
		})
		const bindedCreateAction = createTransactionAction.bind(null, createTxDto);
		const createResponse = await fetchFunction(bindedCreateAction);

		return { createTxDto, createResponse };
	}, [bridgeTxFee, chain, destinationChain, fetchFunction, accountInfoState.account])

	const handleSubmitCallback = useCallback(
		async (address: string, amount: number) => {
			/*
			setTransactionInProgress(true)
			return
			*/

			setLoading(true);
			try {
				const createTxResp = await createTx(address, amount);

				const response = await signAndSubmitTx(
					createTxResp.createTxDto,
					createTxResp.createResponse,
					dispatch,
				);

				response && setTxInProgress(response.bridgeTx);
			}catch(err) {
				console.log(err);
				toast.error(`${err}`)
			} finally {
				setLoading(false);
			}
		},
		[createTx, dispatch],
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
					borderTop:'2px solid #077368',
					p:2,
					background: 'linear-gradient(180deg, #052531 57.87%, rgba(5, 37, 49, 0.936668) 63.14%, rgba(5, 37, 49, 0.1) 132.68%)',
					[tabletMediaQuery]:{
						gridColumn:'span 6'
					}
				}}>
					<TotalBalance/>
					
					<Typography sx={{color:'white',mt:4, mb:2}}>Addresses</Typography>
					<AddressBalance/>
					
				</Box>
				
				{/* right side */}
				<Box sx={{
					gridColumn:'span 4', 
					borderTop:'2px solid #F25041',
					p:2,
					background: 'linear-gradient(180deg, #052531 57.87%, rgba(5, 37, 49, 0.936668) 63.14%, rgba(5, 37, 49, 0.1) 132.68%)',
					[tabletMediaQuery]:{
						gridColumn:'span 6'
					}
				}}>
					{/* conditional display of right side element */}
					{!txInProgress ?
						<BridgeInput
							bridgeTxFee={bridgeTxFee}
							createTx={createTx}
							submit={handleSubmitCallback}
							disabled={loading}
						/> :
						<TransferProgress bridgeTx={txInProgress}/>
					}
				</Box>
			</Box>
		</BasePage>
	)
}

export default NewTransactionPage;

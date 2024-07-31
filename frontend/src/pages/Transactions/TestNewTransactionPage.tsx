import { Box, Typography } from "@mui/material";
import BasePage from "../base/BasePage";
import AddressBalance from "./components/AddressBalance";
import TotalBalance from "./components/TotalBalance";
import TransferProgress from "./components/TransferProgress";
import BridgeInput from "./components/BridgeInput";
import { chainIcons, validateSubmitTxInputs } from "../../utils/generalUtils";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { useCallback, useEffect, useState } from "react";
import { useTryCatchJsonByAction } from "../../utils/fetchUtils";
import { toast } from "react-toastify";
import { createTransactionAction } from "./action";
import { CreateTransactionDto, CreateTransactionReceiverDto } from "../../swagger/apexBridgeApiService";
import appSettings from "../../settings/appSettings";
import { signAndSubmitTx } from "../../actions/submitTx";
import { getWalletBalanceAction } from "../../actions/balance";

// TODO: add input validations
function NewTransactionPage() {
	const [txInProgress, setTxInProgress] = useState(false);
	const [loading, setLoading] = useState(false);
	const [totalDfmBalance, setTotalDfmBalance] = useState<string|null>(null);
	
	const {chain, destinationChain} = useSelector((state: RootState)=> state.chain);
    const walletState = useSelector((state: RootState) => state.wallet);

	const getBalance = useCallback(async () => {
		if (walletState.accountInfo?.account) {
			const balanceResp = await getWalletBalanceAction(chain, walletState.accountInfo.account)
			setTotalDfmBalance(balanceResp.balance)
		}
	}, [chain, walletState.accountInfo])

	useEffect(() => {
		getBalance()
	}, [getBalance])
	
	const bridgeTxFee = appSettings.bridgingFee;

	// TODO - update these to check for nexus when implemented
	const SourceIcon = chain === 'prime' ? chainIcons.prime : chainIcons.vector;
	const DestinationIcon = destinationChain === 'prime' ? chainIcons.prime : chainIcons.vector;

	const dispatch = useDispatch();
	const fetchFunction = useTryCatchJsonByAction();

	const handleSubmitCallback = useCallback(
		async (address: string, amount: number) => {
			/*
			setTransactionInProgress(true)
			return
			*/

			const validationErr = validateSubmitTxInputs(destinationChain, address, amount);
			if (validationErr) {
				toast.error(validationErr);
				return;
			}

			setLoading(true);
			try {
				const createTxDto = new CreateTransactionDto({
					bridgingFee: bridgeTxFee,
					destinationChain,
					originChain: chain,
					senderAddress: walletState.accountInfo?.account || '',
					receivers: [new CreateTransactionReceiverDto({
						address, amount,
					})]
				})
				const bindedCreateAction = createTransactionAction.bind(null, createTxDto);
				const createResponse = await fetchFunction(bindedCreateAction);

				const success = await signAndSubmitTx(
					createTxDto,
					createResponse,
					dispatch,
				);

				success && setTxInProgress(true);
			}catch(err) {
				console.log(err);
				toast.error(`${err}`)
			} finally {
				setLoading(false);
			}
		},
		[bridgeTxFee, chain, destinationChain, dispatch, fetchFunction, walletState.accountInfo?.account],
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
					<TotalBalance totalDfmBalance={totalDfmBalance}/>
					
					<Typography sx={{color:'white',mt:4, mb:2}}>Addresses</Typography>
					<AddressBalance totalDfmBalance={totalDfmBalance}/>
					
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
							totalDfmBalance={totalDfmBalance}
							bridgeTxFee={bridgeTxFee}
							submit={handleSubmitCallback}
							disabled={loading}
						/> :
						<TransferProgress/>
					}
				</Box>
			</Box>
		</BasePage>
	)
}

export default NewTransactionPage;

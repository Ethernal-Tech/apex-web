import { Box, Typography } from "@mui/material";
import BasePage from "../base/BasePage";
import AddressBalance from "./components/AddressBalance";
import TotalBalance from "./components/TotalBalance";
import TransferProgress from "./components/TransferProgress";
import FallbackTransferProgress from "./components/TransferProgressFallback";
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
import { signAndSubmitTx, signAndSubmitNexusToPrimeFallbackTx, signAndSubmitPrimeToNexusFallbackTx } from "../../actions/submitTx";
import { CreateTxResponse } from "./components/types";

// TODO: add input validations
function NewTransactionPage() {
	const [txInProgress, setTxInProgress] = useState<BridgeTransactionDto | undefined>();
	const [fallbackTxInProgress, setFallbackTxInProgress] = useState<BridgeTransactionDto | undefined>();

	const [loading, setLoading] = useState(false);
	
	const chain = useSelector((state: RootState)=> state.chain.chain);
	const destinationChain = useSelector((state: RootState)=> state.chain.destinationChain);
	const account = useSelector((state: RootState) => state.accountInfo.account);


	// conditionally implementing bridgeTxFee depending on selected network
	const bridgeTxFee = chain === ChainEnum.Nexus ? 
		appSettings.nexusBridgingFee : appSettings.primeVectorBridgingFee;

	// TODO - update these to check for nexus when implemented
	const SourceIcon = chainIcons[chain];
	const DestinationIcon = chainIcons[destinationChain];

	const dispatch = useDispatch();
	const fetchFunction = useTryCatchJsonByAction();

	const createTx = useCallback(async (address: string, amount: number): Promise<CreateTxResponse> => {
		const validationErr = validateSubmitTxInputs(chain, destinationChain, address, amount);
		if (validationErr) {
			throw new Error(validationErr);
		}

		const createTxDto = new CreateTransactionDto({
			bridgingFee: bridgeTxFee,
			destinationChain,
			originChain: chain,
			senderAddress: account,
			receivers: [new CreateTransactionReceiverDto({
				address, amount,
			})]
		})
		const bindedCreateAction = createTransactionAction.bind(null, createTxDto);
		const createResponse = await fetchFunction(bindedCreateAction);

		return { createTxDto, createResponse };
	}, [bridgeTxFee, chain, destinationChain, fetchFunction, account])

	const handleSubmitCallback = useCallback(
		async (address: string, amount: number) => {
			setLoading(true);
			try {	
				// nexus->prime
				if(chain === ChainEnum.Nexus && destinationChain === ChainEnum.Prime){ // nexus->prime						
					const txReceipt = await signAndSubmitNexusToPrimeFallbackTx(amount, destinationChain, address)

					txReceipt && setFallbackTxInProgress(
						new BridgeTransactionDto({
							amount: amount,
							createdAt: new Date(), // removed for fallback bridge
							destinationChain: ChainEnum.Prime,
							destinationTxHash: "", // removed for fallback bridge
							finishedAt: new Date(), // removed for fallback bridge
							id: 0, // // removed for fallback bridge
							originChain: ChainEnum.Nexus,
							receiverAddresses: "", // removed for fallback bridge
							senderAddress: "", // removed for fallback bridge
							sourceTxHash: txReceipt.transactionHash.toString(), // tx hash on nexus
							status: TransactionStatusEnum.Pending,
						})
					)
				} 

				// prime->nexus, API service formats tx as fallBack, and setFallbackTxInProgress is used 
				else if(chain === ChainEnum.Prime && destinationChain === ChainEnum.Nexus){
					// const response = await signAndSubmitPrimeToNexusFallbackTx(amount, destinationChain, address)

					const createTxResp = await createTx(address, amount);

					const txReceipt = await signAndSubmitTx(
						createTxResp.createTxDto,
						createTxResp.createResponse,
						dispatch,
					);

					txReceipt && setFallbackTxInProgress(
						new BridgeTransactionDto({
							amount: amount,
							createdAt: new Date(), // removed for fallback bridge
							destinationChain: ChainEnum.Nexus,
							destinationTxHash: "", // removed for fallback bridge
							finishedAt: new Date(), // removed for fallback bridge
							id: 0, // // removed for fallback bridge
							originChain: ChainEnum.Prime,
							receiverAddresses: "", // removed for fallback bridge
							senderAddress: "", // removed for fallback bridge
							sourceTxHash: txReceipt.txHash.toString(), // tx hash on nexus
							status: TransactionStatusEnum.Pending,
						})
					)
				} 
				// "vector-prime-vetor", so tx created and status shown as usual
				else { 
					const createTxResp = await createTx(address, amount);
					
					const response = await signAndSubmitTx(
						createTxResp.createTxDto,
						createTxResp.createResponse,
						dispatch,
					);
					
					response && setTxInProgress(response.bridgeTx);
				}
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
					{!txInProgress && !fallbackTxInProgress &&
						<BridgeInput
							bridgeTxFee={bridgeTxFee}
							createTx={createTx}
							submit={handleSubmitCallback}
							loading={loading}
						/>
					}

					{/* for regular bridge tx's */}
					{txInProgress && <TransferProgress tx={txInProgress} setTx={setTxInProgress}/>}

					{/* for nexus->prime->nexus transactions (fallback) */}
					{fallbackTxInProgress && <FallbackTransferProgress tx={fallbackTxInProgress} setTx={setFallbackTxInProgress}/>}
				</Box>
			</Box>
		</BasePage>
	)
}

export default NewTransactionPage;

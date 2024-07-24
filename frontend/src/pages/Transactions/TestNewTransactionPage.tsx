import { Box, Typography } from "@mui/material";
import BasePage from "../base/BasePage";
import AddressBalance from "./components/AddressBalance";
import TotalBalance from "./components/TotalBalance";
import TransferProgress from "./components/TransferProgress";
import BridgeInput from "./components/BridgeInput";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import walletHandler from "../../features/WalletHandler";
import { useState } from "react";

// TODO: add input validations
function NewTransactionPage() {
	const [txInProgress, setTxInProgress] = useState(false)
	const [totalDfmBalance, setTotalDfmBalance] = useState<string|null>(null)
	
	const {chain, destinationChain} = useSelector((state: RootState)=> state.chain)

	// get and set wallet lovelace balance
	if(walletHandler.checkWallet()){
		walletHandler.getBalance().then(result=> {
			const lovelaceObject = result.find(item=> item.unit === 'lovelace')
			if(lovelaceObject){
				setTotalDfmBalance(lovelaceObject.quantity)
			}
		})
	}

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
					<Typography fontSize={'27px'} fontWeight={500}>{chain}</Typography>
				</Box>

				<Box sx={{ 
					gridColumn:'span 4', 
					color:'white', 
					textTransform:'capitalize',
					[tabletMediaQuery]:{
						gridColumn:'span 3'
					}
				}}>
					<Typography>Destination chain</Typography>
					<Typography fontSize={'27px'} fontWeight={500}>{destinationChain}</Typography>
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
					{/* conditional display of right element */}
					{txInProgress === false ? 
						<BridgeInput 
							setTxInProgress={setTxInProgress} 
							totalBalance={totalDfmBalance}
						/> :
						<TransferProgress/>
					}
				</Box>
			</Box>
		</BasePage>
	)
}

export default NewTransactionPage;

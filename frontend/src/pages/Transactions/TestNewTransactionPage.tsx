import { Box, Typography } from "@mui/material";
import BasePage from "../base/BasePage";
import AddressBalance from "./components/AddressBalance";
import TotalBalance from "./components/TotalBalance";
import TransferProgress from "./components/TransferProgress";
import BridgeInput from "./components/BridgeInput";
import { dfmToApex } from "../../utils/generalUtils";

let transactionInProgress = false; // change to "true" to toogle view

// TODO: add input validations
function NewTransactionPage() {
	
	const totalBalanceInDfm = 56600000001 // TODO - actually fetch this balance (presented in dfm)
	const totalBalanceApex = dfmToApex(totalBalanceInDfm)

	return (
		<BasePage>
			<Box width={'100%'} sx={{
				display:'grid',
				gridTemplateColumns:'repeat(3,1fr)', 
				gap:'24px',
			}}>
				{/* left side */}
				<Box sx={{
					gridColumn:'span 1', 
					borderTop:'2px solid #077368',
					p:2,
					background: 'linear-gradient(180deg, #052531 57.87%, rgba(5, 37, 49, 0.936668) 63.14%, rgba(5, 37, 49, 0.1) 132.68%)',
				}}>
					<TotalBalance totalBalance={totalBalanceApex}/>
					
					<Typography sx={{color:'white',mt:4, mb:2}}>Addresses</Typography>
					<AddressBalance totalBalance={totalBalanceApex}/>
					
				</Box>
				
				{/* right side */}
				<Box sx={{
					gridColumn:'span 2', 
					borderTop:'2px solid #F25041',
					p:2,
					background: 'linear-gradient(180deg, #052531 57.87%, rgba(5, 37, 49, 0.936668) 63.14%, rgba(5, 37, 49, 0.1) 132.68%)',
				}}>
					{/* conditional display of right element */}
					{transactionInProgress === false ? <BridgeInput totalBalance={totalBalanceApex}/> :<TransferProgress/>}
				</Box>
			</Box>
		</BasePage>
	)
}

export default NewTransactionPage;

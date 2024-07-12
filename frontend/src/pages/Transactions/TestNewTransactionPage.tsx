import { Box, Typography } from "@mui/material";
import BasePage from "../base/BasePage";
import AddressBalance from "./components/AddressBalance";
import TotalBalance from "./components/TotalBalance";
import PasteTextInput from "./components/PasteTextInput";
import NumberInput from "./components/NumberInput";

// TODO: add input validations
function NewTransactionPage() {
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
					<TotalBalance/>
					
					<Typography sx={{color:'white',mt:4, mb:3}}>Addresses</Typography>
					<AddressBalance/>
					
				</Box>

				{/* right side */}
				<Box sx={{
					gridColumn:'span 2', 
					borderTop:'2px solid #F25041',
					p:2,
					background: 'linear-gradient(180deg, #052531 57.87%, rgba(5, 37, 49, 0.936668) 63.14%, rgba(5, 37, 49, 0.1) 132.68%)',
				}}>
					<TotalBalance/>

					<Typography sx={{color:'white',mt:4, mb:3}}>Destination Address</Typography>
					<PasteTextInput sx={{width:'50%'}}/>
					
					<Typography sx={{color:'white',mt:4, mb:3}}>Enter amount to send</Typography>
					<NumberInput sx={{width:'50%'}}/>
				</Box>
			</Box>
		</BasePage>
	)
}

export default NewTransactionPage;

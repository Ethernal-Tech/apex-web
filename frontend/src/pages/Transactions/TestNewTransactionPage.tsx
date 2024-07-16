import { Box, Typography } from "@mui/material";
import BasePage from "../base/BasePage";
import AddressBalance from "./components/AddressBalance";
import TotalBalance from "./components/TotalBalance";
import TransferProgress from "./components/TransferProgress";
import BridgeInput from "./components/BridgeInput";
import ButtonCustom from "../../components/Buttons/ButtonCustom";

let transactionInProgress = false; // change to "true" to toogle view

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
					
					<Typography sx={{color:'white',mt:4, mb:2}}>Addresses</Typography>
					<AddressBalance/>
					
				</Box>
				
				{/* right side 1 -transaction not in progress */}
				{transactionInProgress === false && 
				(
					<BridgeInput/>
				)}
				
				{/* right side 2 - transaction in progress */}
				{transactionInProgress === true && 
				(
					<Box sx={{
						gridColumn:'span 2', 
						borderTop:'2px solid #F25041',
						p:2,
						background: 'linear-gradient(180deg, #052531 57.87%, rgba(5, 37, 49, 0.936668) 63.14%, rgba(5, 37, 49, 0.1) 132.68%)',
					}}>
						<Typography sx={{color:'white',mt:4, mb:2, textAlign:'center'}}>Transfer in progress</Typography>

						<Box sx={{mt:4}}>
							{/* TODO AF - put the entire right side in its own component. organize this better */}
							<TransferProgress/>
						</Box>

						<Box sx={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'20px',mt:4}}>
							<ButtonCustom 
								variant="red"						
								sx={{
									gridColumn:'span 1',
									textTransform:'uppercase'
								}}>
								View bridging history
							</ButtonCustom>
							
							<ButtonCustom 
								variant="white"
								sx={{
									gridColumn:'span 1',
									textTransform:'uppercase'
								}}
							>
								request a refund
							</ButtonCustom>
						</Box>
					</Box>
				)}
			</Box>
		</BasePage>
	)
}

export default NewTransactionPage;

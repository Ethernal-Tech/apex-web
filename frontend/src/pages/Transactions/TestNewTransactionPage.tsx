import { Box } from "@mui/material";
import BasePage from "../base/BasePage";
import AddressBalance from "./components/AddressBalance";

// TODO: add input validations
function NewTransactionPage() {
	return (
		<BasePage>
			<Box width={'100%'} sx={{display:'grid',gridTemplateColumns:'repeat(3,1fr)', gap:'24px'}}>
				<Box sx={{gridColumn:'span 1', border:'1px solid white'}}>Left</Box>
				<Box sx={{gridColumn:'span 2', border:'1px solid white'}}>Right</Box>
			</Box>
			<AddressBalance/>
		</BasePage>
	)
}

export default NewTransactionPage;

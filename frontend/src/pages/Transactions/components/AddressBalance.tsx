import { Box, Typography } from "@mui/material"
import { useSelector } from "react-redux";
import { RootState } from "../../../redux/store";
import { formatAddress } from "../../../utils/generalUtils";

const AddressBalance = () => {
	const account = useSelector((state: RootState) => state.accountInfo.account);
    return (
        <Box px={'17px'} py='20px' sx={{
                border:'1px solid',
                color:'#A1B3A0', 
                background: 'linear-gradient(180deg, #052531 57.87%, rgba(5, 37, 49, 0.936668) 63.14%, rgba(5, 37, 49, 0.1) 132.68%)',
                borderRadius:'4px', 
                fontWeight:'500',
                borderImageSource: 'linear-gradient(180deg, #435F69 10.63%, rgba(67, 95, 105, 0) 130.31%)',
                borderImageSlice: 1,
                }}>
            <Box sx={{display:'flex', justifyContent:'space-between'}}>
                <Typography fontSize="13px" textTransform={'lowercase'} sx={{display:'flex',alignItems:'center', color:'white'}}>
                    {formatAddress(account,14,4)}
                    {/* TODO NICK - add copy to clipboard btn */}
                </Typography>
            </Box>
        </Box>
    )
}

export default AddressBalance
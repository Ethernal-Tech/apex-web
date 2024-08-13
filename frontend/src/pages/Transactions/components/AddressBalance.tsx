import { Box, Typography } from "@mui/material"
import { useSelector } from "react-redux";
import { RootState } from "../../../redux/store";
import { convertDfmToApex, formatAddress } from "../../../utils/generalUtils";

const AddressBalance = () => {
	const account = useSelector((state: RootState) => state.accountInfo.account);
	const balance = useSelector((state: RootState) => state.accountInfo.balance);
    const chain = useSelector((state: RootState)=> state.chain.chain);
    const totalBalanceInApex = balance ? convertDfmToApex(balance, chain) : null;
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
            <Box sx={{display:'flex', justifyContent:'space-between'}} mb={1}>
                <Typography fontSize="14px" textTransform={'uppercase'} color={'white'} sx={{display:'flex',alignItems:'center'}}>
                    address 1
                </Typography>
                <Typography fontSize="13px" textTransform={'lowercase'} sx={{display:'flex',alignItems:'center', color:'white'}}>
                    {formatAddress(account)}
                </Typography>
            </Box>

            {totalBalanceInApex &&
            <Typography fontWeight={500}>
                <Box component='span' sx={{color:'white', fontSize:'18px',lineheight:'27px'}}>
                    {totalBalanceInApex.split('.')[0]}
                </Box>
                
                {/* show decimals if applicable */}
                {totalBalanceInApex.includes('.') &&
                <Box component='span' sx={{fontSize:'12px',lineheight:'24px'}}>
                    .{totalBalanceInApex.split('.')[1]}
                </Box>
                }    
            </Typography>
            }
            
            {/* TODO af - removed for now as APEX doesn't have a price */}
            {/* <Typography>&#36;5,000.00</Typography> */}
        </Box>
    )
}

export default AddressBalance
import { Box, Typography } from "@mui/material"
import { useSelector } from "react-redux";
import { RootState } from "../../../redux/store";
import { formatAddress } from "../../../utils/generalUtils";

type AddressBalanceType = {
    totalBalance: string
}

const AddressBalance = ({totalBalance}: AddressBalanceType) => {
    const tokenState = useSelector((state: RootState) => state.token);

    return (
        <Box px={'17px'} py='20px' width={'100%'} sx={{
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
                    {formatAddress(tokenState.token!.address)}
                </Typography>
            </Box>
            <Typography fontWeight={500}>
                {/* TODO - get actual balance, both this and the decimals */}
                <Box component='span' sx={{color:'white', fontSize:'18px',lineheight:'27px'}}>
                    {totalBalance.split('.')[0]}
                </Box>
                <Box component='span' sx={{fontSize:'12px',lineheight:'24px'}}>
                    .{totalBalance.split('.')[1]}
                </Box>
                
            </Typography>
            
            {/* TODO - removed for now as APEX doesn't have a price */}
            {/* <Typography>&#36;5,000.00</Typography> */}
        </Box>
    )
}

export default AddressBalance
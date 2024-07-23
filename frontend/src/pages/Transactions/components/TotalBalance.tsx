import { Box, Typography } from "@mui/material"

import {ReactComponent as WalletIcon} from "../../../assets/icons/moneyWallet.svg";
import {ReactComponent as ApexIcon} from "../../../assets/icons/apexTransferIcon.svg";

type TotalBalanceType = {
    totalBalance: string
}

const TotalBalance = ({totalBalance}:TotalBalanceType) => {
  return (
    <Box px={'17px'} py='20px' sx={{border:'1px solid #077368',color:'#A1B3A0', background:'#075159',borderRadius:'4px', fontWeight:'500'}}>
        <Box sx={{display:'flex', justifyContent:'space-between'}}>
            
            <Typography textTransform={'uppercase'} color={'white'} sx={{display:'flex',alignItems:'center'}}>
                <WalletIcon/>
                <Box component="span" ml={1}>Total Balance</Box>
            </Typography>

            <Typography textTransform={'uppercase'} sx={{display:'flex',alignItems:'center'}}>
                <ApexIcon/>
                <Box component="span" ml={1}>Apex</Box>
            </Typography>
        </Box>

        <Typography>
            <Box component='span' sx={{color:'#F25041', fontWeight:'600', fontSize:'32px',lineheight:'32px'}}>
                {totalBalance.split('.')[0]}
            </Box>
            <Box component='span' sx={{fontSize:'20px',lineheight:'24px'}}>
                .{totalBalance.split('.')[1]}
            </Box>
        </Typography>
        
        {/* <Typography>&#36;5,000.00</Typography> */}
    </Box>
  )
}

export default TotalBalance
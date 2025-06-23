import { Box, Typography } from "@mui/material"

import {ReactComponent as WalletIcon} from "../../../assets/icons/moneyWallet.svg";
import {ReactComponent as ApexIcon} from "../../../assets/icons/apexTransferIcon.svg";
import { convertDfmToApex, toFixed } from "../../../utils/generalUtils";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux/store";
import appSettings from "../../../settings/appSettings";
import { fromChainToChainCurrency, fromChainToChainNativeToken, TokenEnumToLabel } from "../../../utils/chainUtils";

const TotalBalance = () => {
	const totalDfmBalance = useSelector((state: RootState) => state.accountInfo.balance);
    const chain = useSelector((state: RootState)=> state.chain.chain);
    const chainCurrency = fromChainToChainCurrency(chain);
    const chainNativeToken = fromChainToChainNativeToken(chain);

    const totalBalanceInApex = totalDfmBalance[chainCurrency] ? toFixed(convertDfmToApex(totalDfmBalance[chainCurrency], chain), 6) : null;
    const totalBalanceInNativeToken = appSettings.isSkyline && totalDfmBalance[chainNativeToken] ? toFixed(convertDfmToApex(totalDfmBalance[chainNativeToken], chain), 6) : null;

    if (appSettings.isSkyline) {
        return (
            <Box px={'17px'} py='20px' sx={{border:'1px solid #077368',color:'#A1B3A0', background:'transparent',borderRadius:'4px', fontWeight:'500'}}>
                <Typography textTransform={'uppercase'} color={'white'} sx={{display:'flex',alignItems:'center'}}>
                    <WalletIcon/>
                    <Box component="span" ml={1}>Total Balance</Box>
                </Typography>

                {
                    totalBalanceInApex &&
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography>
                            <Box component='span' sx={{color: appSettings.isSkyline ? '#1ea29d' : '#F25041', fontWeight:'600', fontSize:'32px'}}>
                                {totalBalanceInApex.split('.')[0]}
                            </Box>
                            
                            {/* show decimals if applicable */}
                            {totalBalanceInApex.includes('.') &&
                            <Box component='span' sx={{fontSize:'20px'}}>
                                .{totalBalanceInApex.split('.')[1]}
                            </Box>
                            }
                        </Typography>
                        <Typography>{TokenEnumToLabel[chainCurrency]}</Typography>
                    </Box>
                }

                {
                    totalBalanceInNativeToken &&
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography>
                            <Box component='span' sx={{color: appSettings.isSkyline ? '#1ea29d' : '#F25041', fontWeight:'600', fontSize:'32px'}}>
                                {totalBalanceInNativeToken.split('.')[0]}
                            </Box>
                            
                            {/* show decimals if applicable */}
                            {totalBalanceInNativeToken.includes('.') &&
                            <Box component='span' sx={{fontSize:'20px'}}>
                                .{totalBalanceInNativeToken.split('.')[1]}
                            </Box>
                            }
                        </Typography>
                        <Typography>{TokenEnumToLabel[chainNativeToken]}</Typography>
                    </Box>
                }
            </Box>
        )
    }
    
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

        {totalBalanceInApex &&
        <Typography>
            <Box component='span' sx={{color:'#F25041', fontWeight:'600', fontSize:'32px',lineheight:'32px'}}>
                {totalBalanceInApex.split('.')[0]}
            </Box>
            
            {/* show decimals if applicable */}
            {totalBalanceInApex.includes('.') &&
            <Box component='span' sx={{fontSize:'20px',lineheight:'24px'}}>
                .{totalBalanceInApex.split('.')[1]}
            </Box>
            }
        </Typography>
        }
        
        {/* <Typography>&#36;5,000.00</Typography> */}
    </Box>
  )
}

export default TotalBalance
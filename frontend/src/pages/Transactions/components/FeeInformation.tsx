import React from 'react';
import { Box, styled, SxProps, Theme, Typography } from '@mui/material';
import { convertDfmToApex, toFixed } from '../../../utils/generalUtils';
import { ChainEnum } from '../../../swagger/apexBridgeApiService';
import appSettings from '../../../settings/appSettings';
import { fromChainToChainCurrency } from '../../../utils/chainUtils';

const CustomBox = styled(Box)({
  background:'#075159'
});

interface FeeInformationProps {
  sx?: SxProps<Theme>;
  userWalletFee: string;
  bridgeTxFee: string;
  operationFee: string;
  chain: ChainEnum
}

const FeeInformation: React.FC<FeeInformationProps> = ({ sx, userWalletFee, bridgeTxFee, operationFee, chain }) => {

  return (
    <CustomBox sx={{
      color:'white',
      display:'flex',
      flexDirection:'column',
      justifyContent:'space-between',
      ...sx
      }}>
        <Typography sx={{
          display:'flex',
          justifyContent:'space-between'
        }}>
          <Box 
            component="span" 
            sx={{
              color:'rgba(255,255,255,0.6)'
            }}>
              User Wallet Fee:
          </Box>
          {/* TODO AF - check this conversion is correct */}
          <Box component="span">{BigInt(userWalletFee) > 0 ? toFixed(convertDfmToApex(userWalletFee, chain), 6) : '0'} {fromChainToChainCurrency(chain)}
          </Box>
        </Typography>
        
        
        <Typography sx={{
          display:'flex',
          justifyContent:'space-between'
        }}>
          <Box 
            component="span" 
            sx={{
              color:'rgba(255,255,255,0.6)'
            }}>
              Bridge Transaction Fee:
          </Box>
          {/* TODO AF - check this conversion is correct */}
          <Box component="span">{BigInt(bridgeTxFee) > 0 ? toFixed(convertDfmToApex(bridgeTxFee, chain), 6): '0'} {fromChainToChainCurrency(chain)}
          </Box>
        </Typography>
        
        {
          appSettings.isSkyline && BigInt(operationFee) > 0 &&
          <Typography sx={{
            display:'flex',
            justifyContent:'space-between'
          }}>
            <Box 
              component="span" 
              sx={{
                color:'rgba(255,255,255,0.6)'
              }}>
                Bridge Operation Fee:
            </Box>
            {/* TODO AF - check this conversion is correct */}
            <Box component="span">{BigInt(operationFee) > 0 ? toFixed(convertDfmToApex(operationFee, chain), 6): '0'} {fromChainToChainCurrency(chain)}
            </Box>
          </Typography>
        }

        <Typography sx={{
          display:'flex',
          justifyContent:'space-between'
        }}>
          <Box 
            component="span" 
            sx={{
              color:'rgba(255,255,255,0.6)'
            }}>
              Estimated time
            </Box>
          <Box component="span">16-20 minutes</Box>
        </Typography>
    </CustomBox>
  );
};

export default FeeInformation;

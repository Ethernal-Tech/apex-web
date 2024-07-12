import React from 'react';
import { Box, styled, SxProps, Theme, Typography } from '@mui/material';

const CustomBox = styled(Box)({
  background:'#075159'
});

interface FeeInformationProps {
  sx?: SxProps<Theme>;
}

const FeeInformation: React.FC<FeeInformationProps> = ({ sx }) => {

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
          <Box component="span">2 APEX</Box>
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
          <Box component="span">2 APEX</Box>
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
              Estimated time
            </Box>
          <Box component="span">~ Less than 1 min</Box>
        </Typography>
    </CustomBox>
  );
};

export default FeeInformation;

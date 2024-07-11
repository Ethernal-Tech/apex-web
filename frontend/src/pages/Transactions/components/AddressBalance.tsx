import { Box, Typography } from "@mui/material"

const AddressBalance = () => {
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
                addr1...234
            </Typography>
        </Box>
        <Typography fontWeight={500}>
            <Box component='span' sx={{color:'white', fontSize:'18px',lineheight:'27px'}}>
                56,600
            </Box>
            <Box component='span' sx={{fontSize:'12px',lineheight:'24px'}}>
                .000000 APEX
            </Box>
            
        </Typography>
        <Typography>&#36;5,000.00</Typography>
    </Box>
  )
}

export default AddressBalance
import { Box } from "@mui/material"

const sx = {
  width:'100%',
  color:'white',
  display:'flex',
  justifyContent:'space-between',
  alignItems:'center',
  position:'fixed',
  bottom:0,
  left:0,
  background:'#051D26',
  borderTop: '1px solid',
  borderImageSource: 'linear-gradient(90deg, rgba(67, 95, 105, 0) 0%, #435F69 50%, rgba(67, 95, 105, 0) 100%)',
  borderImageSlice: 1,
  minHeight:'56px'
}

const FooterBar = () => {
  return (
    <Box sx={sx}>
      <Box component='span'>
        &copy;2024, Apex Fusion, All Rights Reserved
      </Box>

      <Box component='span'>
        socials
      </Box>
      
      <Box component='span'>
        TestNet:[Network]
      </Box>
    </Box>
  )
}

export default FooterBar
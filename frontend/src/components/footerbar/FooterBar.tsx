import { Box } from "@mui/material"

const containerStyles = {
  width:'100%',
  color:'white',
  position:'fixed',
  bottom:0,
  left:0,
  background:'#051D26',
  borderTop: '1px solid',
  borderImageSource: 'linear-gradient(90deg, rgba(67, 95, 105, 0) 0%, #435F69 50%, rgba(67, 95, 105, 0) 100%)',
  borderImageSlice: 1,
  minHeight:'56px',
  display:'flex'
}

const childStyles = {
  width:'calc(100%/3)',
  alignSelf:'center',
  '&:nth-child(2)':{
    textAlign:'center',
  },
  '&:nth-child(3)':{
    textAlign:'right'
  }
}

const FooterBar = () => {
  return (
    <Box sx={containerStyles}>
      <Box sx={childStyles}>
        &copy;2024, Apex Fusion, All Rights Reserved
      </Box>

      <Box sx={childStyles}>
        socials
      </Box>
      
      <Box sx={childStyles}>
        TestNet:[Network]
      </Box>
    </Box>
  )
}

export default FooterBar
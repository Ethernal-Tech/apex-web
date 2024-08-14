import { Box, Button } from "@mui/material"
import {ReactComponent as ApexIcon} from "../../assets/external-links/Apex.svg";
import {ReactComponent as LinkedinIcon} from "../../assets/external-links/LN.svg";
import {ReactComponent as XIcon} from "../../assets/external-links/X.svg";
import {ReactComponent as DiscordIcon} from "../../assets/external-links/Discord.svg";

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
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  boxSizing:'border-box',
  width:'calc(100%/3)',
  alignSelf:'center',
  '&:nth-of-type(1)':{
    textAlign:'left',
    paddingLeft:'20px'
  },
  '&:nth-of-type(2)':{
    textAlign:'center',
    paddingLeft:'20px'
  },
  '&:nth-of-type(3)':{
    textAlign:'right',
    paddingRight:'20px'
  }
}

const FooterBar = () => {
  return (
    <Box sx={containerStyles}>
      <Box sx={childStyles}>
        &copy;{new Date().getFullYear()} Apex Fusion. All Rights Reserved.
      </Box>

      <Box sx={{
        ...childStyles,
        display:'flex',
        justifyContent:'center',
        alignItems:'center',
      }}>
        <Button component='a' href="https://apexfusion.org/" target="_blank">
          <ApexIcon/>
        </Button>
        <Button component='a' href="https://www.linkedin.com/company/apexfusioncore" target="_blank">
          <LinkedinIcon/>
        </Button>
        <Button component='a' href="https://x.com/apexfusion" target="_blank">
          <XIcon/>
        </Button>
        <Button component='a' href="https://discord.com/invite/2nSBGyvjpZ" target="_blank">
          <DiscordIcon/>
        </Button>
      </Box>
      
      <Box sx={childStyles}>
        Network: Testnet
      </Box>
    </Box>
  )
}

export default FooterBar
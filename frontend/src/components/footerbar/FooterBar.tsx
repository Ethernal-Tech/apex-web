import { Box, Button, Link } from "@mui/material"
import {ReactComponent as ApexIcon} from "../../assets/external-links/Apex.svg";
import {ReactComponent as LinkedinIcon} from "../../assets/external-links/LN.svg";
import {ReactComponent as XIcon} from "../../assets/external-links/X.svg";
import {ReactComponent as DiscordIcon} from "../../assets/external-links/Discord.svg";
import { Link as RouterLink } from "react-router-dom";
import appSettings from "../../settings/appSettings";

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
  display:'flex',
  padding:'10px 0'
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
        <Box>
          &copy;{new Date().getFullYear()} Apex Fusion. All Rights Reserved.
        </Box>
        <Box sx={{display:'flex',"gap":'10px',marginTop:'10px',fontSize:'14px'}}>
          <Link component={RouterLink} to="/terms-of-service" sx={{ color: 'inherit', textDecoration: 'none'}}>Terms of Service</Link>
          <Link component={RouterLink} to="/privacy-policy" sx={{ color: 'inherit', textDecoration: 'none'}}>Privacy Policy</Link>
        </Box>
      </Box>

      <Box sx={{
        ...childStyles,
        display:'flex',
        justifyContent:'center',
        alignItems:'center',
      }}>
        <Box>
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
      </Box>
      
      <Box sx={childStyles}>
        <Box component='span' sx={{marginRight:'2px'}}>Network: </Box>
        <Box component='span' sx={{
          backgroundColor:'#fa7b14',
          display:'inline-block',
          padding:'4px 12px',
          borderRadius:'100px'
        }}>{appSettings.isMainnet ? 'Mainnet' : 'Testnet'}</Box>
      </Box>
    </Box>
  )
}

export default FooterBar
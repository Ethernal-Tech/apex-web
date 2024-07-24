import { Box, Typography } from '@mui/material'
import TotalBalance from "../components/TotalBalance";
import PasteTextInput from "../components/PasteTextInput";
import PasteApexAmountInput from "./PasteApexAmountInput";
import FeeInformation from "../components/FeeInformation";
import ButtonCustom from "../../../components/Buttons/ButtonCustom";
import { Dispatch, SetStateAction } from 'react';

type BridgeInputType = {
    totalBalance: string,
    setTxInProgress: Dispatch<SetStateAction<boolean>>
}

const BridgeInput = ({totalBalance, setTxInProgress}:BridgeInputType) => {
  return (
    <Box sx={{width:'100%'}}>
        <TotalBalance totalBalance={totalBalance}/>

        <Typography sx={{color:'white',mt:4, mb:2}}>Destination Address</Typography>
        {/* validate inputs */}
        <PasteTextInput sx={{width:'50%'}}/>

        <Typography sx={{color:'white',mt:4, mb:1}}>Enter amount to send</Typography>
        <Box sx={{
            display:'grid',
            gridTemplateColumns:'repeat(2,1fr)',
            gap:'20px'
        }}>
            {/* validate inputs */}
            <PasteApexAmountInput 
                totalBalance={totalBalance}
                sx={{
                    gridColumn:'span 1',
                    borderBottom: '2px solid',
                    borderImageSource: 'linear-gradient(180deg, #435F69 10.63%, rgba(67, 95, 105, 0) 130.31%)',
                    borderImageSlice: 1,
                    paddingBottom:2,
                    paddingTop:2
                }}/>
            
            <FeeInformation sx={{
                gridColumn:'span 1',
                border: '1px solid #077368',
                borderRadius:'8px',
                padding:2

            }}/>
            
            <ButtonCustom 
                variant="red"						
                sx={{
                    gridColumn:'span 1',
                    textTransform:'uppercase'
                }}>
                Discard
            </ButtonCustom>
            
            <ButtonCustom 
                variant="white"
                onClick={()=>setTxInProgress(true)}
                sx={{
                    gridColumn:'span 1',
                    textTransform:'uppercase'
                }}
            >
                Move funds
            </ButtonCustom>
        </Box>
    </Box>
  )
}

export default BridgeInput
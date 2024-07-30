import { Box, Typography } from '@mui/material'
import TotalBalance from "../components/TotalBalance";
import PasteTextInput from "../components/PasteTextInput";
import PasteApexAmountInput from "./PasteApexAmountInput";
import FeeInformation from "../components/FeeInformation";
import ButtonCustom from "../../../components/Buttons/ButtonCustom";
import { useCallback, useState } from 'react';
import { convertApexToUtxoDfm } from '../../../utils/generalUtils';

type BridgeInputType = {
    totalDfmBalance: string|null
    bridgeTxFee: number
    submit:(address: string, amount: number) => Promise<void>
    disabled?: boolean;
}

const BridgeInput = ({totalDfmBalance, bridgeTxFee, submit, disabled}:BridgeInputType) => {
  const [destinationAddr, setDestinationAddr] = useState('');
  const [amount, setAmount] = useState('')

  const onDiscard = () => {
    setDestinationAddr('')
    setAmount('')
  }

  // TODO: figure out how to calculate this
  const userWalletFee = +'1000000'

  const maxAmountDfm = totalDfmBalance
    ? (+totalDfmBalance - userWalletFee - bridgeTxFee) : null;

  const onSubmit = useCallback(async () => {
    await submit(destinationAddr, convertApexToUtxoDfm(amount || '0'))
  }, [amount, destinationAddr, submit]) 

  return (
    <Box sx={{width:'100%'}}>
        <TotalBalance totalDfmBalance={totalDfmBalance}/>

        <Typography sx={{color:'white',mt:4, mb:2}}>Destination Address</Typography>
        {/* validate inputs */}
        <PasteTextInput sx={{width:'50%'}} text={destinationAddr} setText={setDestinationAddr} disabled={disabled}/>

        <Typography sx={{color:'white',mt:4, mb:1}}>Enter amount to send</Typography>
        <Box sx={{
            display:'grid',
            gridTemplateColumns:'repeat(2,1fr)',
            gap:'20px'
        }}>
            {/* validate inputs */}
            <PasteApexAmountInput
                maxAmountDfm={maxAmountDfm}
                text={amount}
                setText={setAmount}
                disabled={disabled}
                sx={{
                    gridColumn:'span 1',
                    borderBottom: '2px solid',
                    borderImageSource: 'linear-gradient(180deg, #435F69 10.63%, rgba(67, 95, 105, 0) 130.31%)',
                    borderImageSlice: 1,
                    paddingBottom:2,
                    paddingTop:2
                }}/>
            
            <FeeInformation
                userWalletFee={userWalletFee}
                bridgeTxFee={bridgeTxFee}
                sx={{
                    gridColumn:'span 1',
                    border: '1px solid #077368',
                    borderRadius:'8px',
                    padding:2

                }}
            />
            
            <ButtonCustom
                onClick={onDiscard}
                disabled={disabled}
                variant="red"						
                sx={{
                    gridColumn:'span 1',
                    textTransform:'uppercase'
                }}>
                Discard
            </ButtonCustom>
            
            <ButtonCustom 
                onClick={onSubmit}
                variant="white"
                disabled={disabled}
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
import { Box, Typography } from '@mui/material'
import TotalBalance from "../components/TotalBalance";
import PasteTextInput from "../components/PasteTextInput";
import PasteApexAmountInput from "./PasteApexAmountInput";
import FeeInformation from "../components/FeeInformation";
import ButtonCustom from "../../../components/Buttons/ButtonCustom";
import { useCallback, useEffect, useRef, useState } from 'react';
import { convertApexToDfm } from '../../../utils/generalUtils';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';
import { CreateTxResponse } from './types';
import { CreateTransactionResponseDto } from '../../../swagger/apexBridgeApiService';
import appSettings from '../../../settings/appSettings';

type BridgeInputType = {
    bridgeTxFee: number
    createTx: (address: string, amount: number) => Promise<CreateTxResponse>
    submit:(address: string, amount: number) => Promise<void>
    disabled?: boolean;
}

const BridgeInput = ({bridgeTxFee, createTx, submit, disabled}:BridgeInputType) => {
  const [destinationAddr, setDestinationAddr] = useState('');
  const [amount, setAmount] = useState('')
  const [createdTx, setCreatedTx] = useState<CreateTransactionResponseDto | undefined>();
  const fetchCreateTxTimeoutRef = useRef<NodeJS.Timeout | undefined>();

  const totalDfmBalance = useSelector((state: RootState) => state.accountInfo.balance);
  const chain = useSelector((state: RootState)=> state.chain.chain);

  const fetchCreatedTx = useCallback(async () => {
    if (!destinationAddr || !amount) {
        setCreatedTx(undefined);
        return;
    }

    try {
        const createdTxResp = await createTx(destinationAddr, +convertApexToDfm(amount || '0', chain));
        setCreatedTx(createdTxResp.createResponse);
    } catch {
        setCreatedTx(undefined);
    }
  }, [amount, chain, createTx, destinationAddr])

  useEffect(() => {
    if (fetchCreateTxTimeoutRef.current) {
        clearTimeout(fetchCreateTxTimeoutRef.current);
        fetchCreateTxTimeoutRef.current = undefined;
    }

    fetchCreateTxTimeoutRef.current = setTimeout(fetchCreatedTx, 500);

    return () => {
        if (fetchCreateTxTimeoutRef.current) {
            clearTimeout(fetchCreateTxTimeoutRef.current);
            fetchCreateTxTimeoutRef.current = undefined;
        }
    }
  }, [fetchCreatedTx])

  const onDiscard = () => {
    setDestinationAddr('')
    setAmount('')
  }

  const maxAmountDfm = totalDfmBalance
    ? Math.max(+totalDfmBalance - appSettings.potentialWalletFee - bridgeTxFee - appSettings.minUtxoValue, 0) : null;

  const onSubmit = useCallback(async () => {
    await submit(destinationAddr, +convertApexToDfm(amount || '0', chain))
  }, [amount, destinationAddr, submit, chain]) 

  return (
    <Box sx={{width:'100%'}}>
        <TotalBalance/>

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
                maxSendableDfm={maxAmountDfm}
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
                userWalletFee={createdTx?.txFee || 0}
                bridgeTxFee={bridgeTxFee}
                chain={chain}
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
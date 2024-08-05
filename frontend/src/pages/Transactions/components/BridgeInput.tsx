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
import { ChainEnum, CreateTransactionResponseDto } from '../../../swagger/apexBridgeApiService';
import appSettings from '../../../settings/appSettings';

type BridgeInputType = {
    bridgeTxFee: number
    createTx: (address: string, amount: number) => Promise<CreateTxResponse>
    submit:(address: string, amount: number) => Promise<void>
    loading?: boolean;
}

const BridgeInput = ({bridgeTxFee, createTx, submit, loading}:BridgeInputType) => {
  const [destinationAddr, setDestinationAddr] = useState('');
  const [amount, setAmount] = useState('')
  const [createdTx, setCreatedTx] = useState<CreateTransactionResponseDto | undefined>();
  const fetchCreateTxTimeoutRef = useRef<NodeJS.Timeout | undefined>();

  const totalDfmBalance = useSelector((state: RootState) => state.accountInfo.balance);
  const {chain, destinationChain} = useSelector((state: RootState)=> state.chain);

  const fetchCreatedTx = useCallback(async () => {
    if(chain === ChainEnum.Prime && destinationChain === ChainEnum.Nexus){
        // TODO - remove this once the tx-formatting-service works for prime->nexus
        return;
    }

    if(chain === ChainEnum.Nexus && destinationChain === ChainEnum.Prime){
        // not used as tx is formatted in frontend (nexus->prime)
        return;
    }

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

    // either for nexus(wei dfm), or prime&vector (lovelace dfm) units
  const minDfmValue = chain === ChainEnum.Nexus ? 
    appSettings.minEvmValue : appSettings.minUtxoValue;
    
    const maxAmountDfm:string = totalDfmBalance ?
    (BigInt(totalDfmBalance) - BigInt(appSettings.potentialWalletFee) - BigInt(bridgeTxFee) - BigInt(minDfmValue)).toString() : '0';
    // Math.max(+totalDfmBalance - appSettings.potentialWalletFee - bridgeTxFee - minDfmValue, 0) : null; // this causes 0 on nexus, seems to be a bug

  const onSubmit = useCallback(async () => {
    await submit(destinationAddr, +convertApexToDfm(amount || '0', chain))
  }, [amount, destinationAddr, submit, chain]) 

  return (
    <Box sx={{width:'100%'}}>
        <TotalBalance/>

        <Typography sx={{color:'white',mt:4, mb:2}}>Destination Address</Typography>
        {/* validate inputs */}
        <PasteTextInput sx={{width:'50%'}} text={destinationAddr} setText={setDestinationAddr} disabled={loading}/>

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
                setAmount={setAmount}
                disabled={loading}
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
                disabled={loading}
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
                disabled={loading || BigInt(maxAmountDfm) <= 0}
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
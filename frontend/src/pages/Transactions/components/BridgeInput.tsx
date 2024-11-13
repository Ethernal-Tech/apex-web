import { Box, Typography } from '@mui/material'
import TotalBalance from "../components/TotalBalance";
import PasteTextInput from "../components/PasteTextInput";
import PasteApexAmountInput from "./PasteApexAmountInput";
import FeeInformation from "../components/FeeInformation";
import ButtonCustom from "../../../components/Buttons/ButtonCustom";
import { useCallback, useEffect, useRef, useState } from 'react';
import { convertApexToDfm, convertDfmToWei } from '../../../utils/generalUtils';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';
import { CardanoTransactionFeeResponseDto, ChainEnum, CreateEthTransactionResponseDto } from '../../../swagger/apexBridgeApiService';
import appSettings from '../../../settings/appSettings';
import { estimateEthGas } from '../../../actions/submitTx';

type BridgeInputType = {
    bridgeTxFee: string
    getCardanoTxFee: (address: string, amount: string) => Promise<CardanoTransactionFeeResponseDto>
    getEthTxFee: (address: string, amount: string) => Promise<CreateEthTransactionResponseDto>
    submit:(address: string, amount: string) => Promise<void>
    loading?: boolean;
}

const BridgeInput = ({bridgeTxFee, getCardanoTxFee, getEthTxFee, submit, loading}:BridgeInputType) => {
  const [destinationAddr, setDestinationAddr] = useState('');
  const [amount, setAmount] = useState('')
  const [userWalletFee, setUserWalletFee] = useState<string | undefined>();
  const fetchCreateTxTimeoutRef = useRef<NodeJS.Timeout | undefined>();

  const totalDfmBalance = useSelector((state: RootState) => state.accountInfo.balance);
  const {chain} = useSelector((state: RootState)=> state.chain);
  const minUtxoValueDfm = useSelector((state: RootState) => state.settings.minUtxoValue);

  const fetchWalletFee = useCallback(async () => {
    if (!destinationAddr || !amount) {
        setUserWalletFee(undefined);
        return;
    }

    try {
        if (chain === ChainEnum.Prime || chain === ChainEnum.Vector) {
            const feeResp = await getCardanoTxFee(destinationAddr, convertApexToDfm(amount || '0', chain));
            setUserWalletFee((feeResp?.fee || 0).toString());

            return;
        } else if (chain === ChainEnum.Nexus) {
            const feeResp = await getEthTxFee(destinationAddr, convertApexToDfm(amount || '0', chain));
            const { bridgingFee, isFallback, ...tx } = feeResp;

            const fee = await estimateEthGas(tx, isFallback);
            setUserWalletFee(fee.toString());

            return;
        }
    } catch (e) {
        console.log('error while calculating wallet fee', e)
    }

    setUserWalletFee(undefined);
    
  }, [amount, chain, getEthTxFee, destinationAddr, getCardanoTxFee])

  useEffect(() => {
    if (fetchCreateTxTimeoutRef.current) {
        clearTimeout(fetchCreateTxTimeoutRef.current);
        fetchCreateTxTimeoutRef.current = undefined;
    }

    fetchCreateTxTimeoutRef.current = setTimeout(fetchWalletFee, 500);

    return () => {
        if (fetchCreateTxTimeoutRef.current) {
            clearTimeout(fetchCreateTxTimeoutRef.current);
            fetchCreateTxTimeoutRef.current = undefined;
        }
    }
  }, [fetchWalletFee])

  const onDiscard = () => {
    setDestinationAddr('')
    setAmount('')
  }

    // either for nexus(wei dfm), or prime&vector (lovelace dfm) units
  const minDfmValue = chain === ChainEnum.Nexus ? 
    convertDfmToWei(minUtxoValueDfm) : minUtxoValueDfm;
    
    const maxAmountDfm:string = totalDfmBalance
        ? ( chain === ChainEnum.Prime || chain === ChainEnum.Vector
            ? (BigInt(totalDfmBalance) - BigInt(appSettings.potentialWalletFee) - BigInt(bridgeTxFee) - BigInt(minDfmValue)).toString()
            : (BigInt(totalDfmBalance) - BigInt(bridgeTxFee) - BigInt(minDfmValue)).toString() // for nexus, using minDfm value as substitute to user wallet fee / potential fee
        )
        : '0';
    // Math.max(+totalDfmBalance - appSettings.potentialWalletFee - bridgeTxFee - minDfmValue, 0) : null; // this causes 0 on nexus, seems to be a bug

  const onSubmit = useCallback(async () => {
    await submit(destinationAddr, convertApexToDfm(amount || '0', chain))
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
                userWalletFee={userWalletFee || '0'}
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
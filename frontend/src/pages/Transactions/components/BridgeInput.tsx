import { Box, Typography } from '@mui/material'
import TotalBalance from "../components/TotalBalance";
import PasteTextInput from "../components/PasteTextInput";
import PasteApexAmountInput from "./PasteApexAmountInput";
import FeeInformation from "../components/FeeInformation";
import ButtonCustom from "../../../components/Buttons/ButtonCustom";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { calculateChangeMinUtxo, convertApexToDfm, convertDfmToWei, tokenIcons } from '../../../utils/generalUtils';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';
import { CardanoTransactionFeeResponseDto, ChainEnum, CreateEthTransactionResponseDto } from '../../../swagger/apexBridgeApiService';
import appSettings from '../../../settings/appSettings';
import { estimateEthGas } from '../../../actions/submitTx';
import CustomSelect from '../../../components/customSelect/CustomSelect';
import { white } from '../../../containers/theme';
import { getIsNativeToken } from '../../../utils/chainUtils';
import { TokenEnum } from '../../../features/enums';
import { useSupportedSourceTokenOptions } from '../utils';

type BridgeInputType = {
    bridgeTxFee: string
    setBridgeTxFee: (val: string) => void
    resetBridgeTxFee: () => void
    operationFee: string
    getCardanoTxFee: (address: string, amount: string, isNativeToken: boolean) => Promise<CardanoTransactionFeeResponseDto>
    getEthTxFee: (address: string, amount: string) => Promise<CreateEthTransactionResponseDto>
    submit:(address: string, amount: string, isNativeToken: boolean) => Promise<void>
    loading?: boolean;
}

const calculateMaxAmount = (
  totalDfmBalance: {[key: string]: string}, chain: ChainEnum,
  changeMinUtxo: number, minDfmValue: string,
  bridgeTxFee: string, operationFee: string, sourceToken?: TokenEnum,
): string => {
  if (!totalDfmBalance || !sourceToken) {
    return '0'
  }

  if (chain === ChainEnum.Nexus) {
    return (BigInt(totalDfmBalance[sourceToken] || '0') - BigInt(bridgeTxFee) -
      BigInt(minDfmValue) - BigInt(operationFee)).toString()
  }

  return (BigInt(totalDfmBalance[sourceToken] || '0')
    - BigInt(appSettings.potentialWalletFee) - BigInt(bridgeTxFee)
    - BigInt(changeMinUtxo) - BigInt(operationFee)).toString()
}

const BridgeInput = ({bridgeTxFee, setBridgeTxFee, resetBridgeTxFee, operationFee, getCardanoTxFee, getEthTxFee, submit, loading}:BridgeInputType) => {
  const [destinationAddr, setDestinationAddr] = useState('');
  const [amount, setAmount] = useState('')
  const [userWalletFee, setUserWalletFee] = useState<string | undefined>();
  const [sourceToken, setSourceToken] = useState<TokenEnum | undefined>();
  const fetchCreateTxTimeoutRef = useRef<NodeJS.Timeout | undefined>();

  const walletUTxOs = useSelector((state: RootState) => state.accountInfo.utxos);
  const totalDfmBalance = useSelector((state: RootState) => state.accountInfo.balance);
  const {chain} = useSelector((state: RootState)=> state.chain);
  const minValueToBridge = useSelector((state: RootState) => state.settings.minValueToBridge)
  const supportedSourceTokenOptions = useSupportedSourceTokenOptions(chain);

  const fetchWalletFee = useCallback(async () => {
    if (!destinationAddr || !amount || !sourceToken) {
        setUserWalletFee(undefined);

        return;
    }

    try {
        if (chain === ChainEnum.Prime || chain === ChainEnum.Vector || chain === ChainEnum.Cardano) {
            const feeResp = await getCardanoTxFee(destinationAddr, convertApexToDfm(amount || '0', chain), getIsNativeToken(chain, sourceToken));
            setUserWalletFee((feeResp?.fee || 0).toString());
            setBridgeTxFee((feeResp?.bridgingFee || 0).toString());

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
    
  }, [destinationAddr, amount, chain, getCardanoTxFee, sourceToken, setBridgeTxFee, getEthTxFee])

  const setSourceTokenCallback = useCallback((token: TokenEnum) => {
    setSourceToken(token);
    setAmount('');
    resetBridgeTxFee();
  }, [resetBridgeTxFee])

  useEffect(() => {
      if (!appSettings.isSkyline) {
        setSourceToken(TokenEnum.APEX)
      }
      else if (supportedSourceTokenOptions.length > 0) {
        setSourceToken(supportedSourceTokenOptions[0].value);
      }    
  }, [chain, supportedSourceTokenOptions])

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

  const changeMinUtxo = useMemo(
    () => calculateChangeMinUtxo(walletUTxOs, +appSettings.minUtxoChainValue[chain]),
    [walletUTxOs, chain],
  );

  // either for nexus(wei dfm), or prime&vector (lovelace dfm) units
  const minDfmValue = chain === ChainEnum.Nexus 
    ? convertDfmToWei(minValueToBridge) 
    : appSettings.isSkyline 
      ? appSettings.minUtxoChainValue[chain]
      : minValueToBridge;
  
  const maxAmountDfm = calculateMaxAmount(
    totalDfmBalance, chain, changeMinUtxo, minDfmValue, bridgeTxFee, operationFee, sourceToken)

  const maxWrappedAmount: string = sourceToken && totalDfmBalance
    ? totalDfmBalance[sourceToken]
    : '0';

  const onSubmit = useCallback(async () => {
    if (!sourceToken) return;
    await submit(destinationAddr, convertApexToDfm(amount || '0', chain), getIsNativeToken(chain, sourceToken))
  }, [amount, destinationAddr, submit, chain, sourceToken]) 

  return (
    <Box sx={{width:'100%'}}>
        <TotalBalance/>

        <Typography sx={{color:'white',mt:4, mb:2}}>Destination Address</Typography>
        {/* validate inputs */}
        <PasteTextInput sx={{width:'50%'}} text={destinationAddr} setText={setDestinationAddr} disabled={loading}/>
        {
          appSettings.isSkyline &&
          <Box sx={{ mt: '20px' }}>
              <Typography mb={'7px'} sx={{ color: white }}>Source Token</Typography>
              <CustomSelect
                  label="SourceToken"
                  icon={sourceToken ? tokenIcons[sourceToken] : undefined}
                  value={sourceToken || ''}
                  onChange={(e) => setSourceTokenCallback(e.target.value as TokenEnum)}
                  options={supportedSourceTokenOptions}
                  width='50%'
              />
          </Box>
        }

        <Typography sx={{color:'white',mt:4, mb:1}}>Enter amount to send</Typography>
        <Box sx={{
            display:'grid',
            gridTemplateColumns:'repeat(2,1fr)',
            gap:'20px'
        }}>
            {/* validate inputs */}
            <PasteApexAmountInput
                maxSendable={sourceToken ? getIsNativeToken(chain, sourceToken) ? maxWrappedAmount : maxAmountDfm : '0'}
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
                bridgeTxFee={bridgeTxFee || '0'}
                operationFee={operationFee || '0'}
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
                variant={appSettings.isSkyline ? "whiteSkyline" : "white"}
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
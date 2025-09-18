import { Box, SelectChangeEvent, Typography } from '@mui/material'
import TotalBalance from "../components/TotalBalance";
import PasteTextInput from "../components/PasteTextInput";
import PasteApexAmountInput from "./PasteApexAmountInput";
import FeeInformation from "../components/FeeInformation";
import ButtonCustom from "../../../components/Buttons/ButtonCustom";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { calculateChangeMinUtxo, convertApexToDfm, convertDfmToWei, minBigInt } from '../../../utils/generalUtils';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';
import { CardanoTransactionFeeResponseDto, ChainEnum, CreateEthTransactionResponseDto } from '../../../swagger/apexBridgeApiService';
import appSettings from '../../../settings/appSettings';
import { estimateEthGas } from '../../../actions/submitTx';
import CustomSelect from '../../../components/customSelect/CustomSelect';
import { white } from '../../../containers/theme';
import { TokenEnum } from '../../../features/enums';
import { useSupportedSourceTokenOptions } from '../utils';
import { BridgingModeEnum, getBridgingMode, getChainInfo, isCardanoChain, isEvmChain } from '../../../settings/chain';
import { getTokenInfo, isWrappedToken } from '../../../settings/token';

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


const calculateMaxAmountToken = (
  totalDfmBalance: {[key: string]: string},
  maxTokenAmountAllowedToBridge: string, chain: ChainEnum,
  sourceToken: TokenEnum | undefined,
): { maxByBalance:bigint, maxByAllowed:bigint } => {
    if (!sourceToken || !isWrappedToken(sourceToken)) {
      return { maxByAllowed: BigInt(0), maxByBalance: BigInt(0) };
    }

    const tokenBalance: bigint = BigInt((sourceToken && totalDfmBalance ? totalDfmBalance[sourceToken] : '0') || '0');

    const tokenBalanceAllowedToUse = BigInt(maxTokenAmountAllowedToBridge || '0') !== BigInt(0) &&
      tokenBalance > BigInt(maxTokenAmountAllowedToBridge || '0')
        ? BigInt(maxTokenAmountAllowedToBridge || '0') : tokenBalance
    
    return {maxByAllowed: tokenBalanceAllowedToUse, maxByBalance: tokenBalance}
}

const calculateMaxAmountCurrency = (
  totalDfmBalance: {[key: string]: string},
  maxAmountAllowedToBridge: string, chain: ChainEnum,
  changeMinUtxo: number, minDfmValue: string,
  bridgeTxFee: string, operationFee: string,
): { maxByBalance:bigint, maxByAllowed:bigint } => {
  if (!totalDfmBalance || !chain) {
    return { maxByAllowed: BigInt(0), maxByBalance: BigInt(0) };
  }

  const sourceToken = getChainInfo(chain).currencyToken;

  const maxAmountAllowedToBridgeDfm = BigInt(maxAmountAllowedToBridge || '0') !== BigInt(0)
    ? (
        isEvmChain(chain)
          ? BigInt(convertDfmToWei(maxAmountAllowedToBridge))
          : BigInt(maxAmountAllowedToBridge)
    )
    : BigInt(0);

  const balanceAllowedToUse = maxAmountAllowedToBridgeDfm !== BigInt(0) &&
    BigInt(totalDfmBalance[sourceToken] || '0') > maxAmountAllowedToBridgeDfm
      ? maxAmountAllowedToBridgeDfm : BigInt(totalDfmBalance[sourceToken] || '0')

  let maxByBalance
  if (isEvmChain(chain)) {
    maxByBalance = BigInt(totalDfmBalance[sourceToken] || '0') - BigInt(bridgeTxFee) -
      BigInt(minDfmValue) - BigInt(operationFee)
  } else {
    maxByBalance = BigInt(totalDfmBalance[sourceToken] || '0')
      - BigInt(appSettings.potentialWalletFee) - BigInt(bridgeTxFee)
      - BigInt(changeMinUtxo) - BigInt(operationFee)
  }

  return {maxByAllowed: balanceAllowedToUse, maxByBalance}
}

const BridgeInput = ({bridgeTxFee, setBridgeTxFee, resetBridgeTxFee, operationFee, getCardanoTxFee, getEthTxFee, submit, loading}:BridgeInputType) => {
  const [destinationAddr, setDestinationAddr] = useState('');
  const [amount, setAmount] = useState('')
  const [userWalletFee, setUserWalletFee] = useState<string | undefined>();
  const [sourceToken, setSourceToken] = useState<TokenEnum | undefined>();
  const fetchCreateTxTimeoutRef = useRef<NodeJS.Timeout | undefined>();

  const walletUTxOs = useSelector((state: RootState) => state.accountInfo.utxos);
  const totalDfmBalance = useSelector((state: RootState) => state.accountInfo.balance);
  const {chain, destinationChain} = useSelector((state: RootState)=> state.chain);
  const settings = useSelector((state: RootState) => state.settings);

  const bridgingModeInfo = getBridgingMode(chain, destinationChain, settings);
  const minValueToBridge = bridgingModeInfo?.settings?.minValueToBridge || '0';
  const maxAmountAllowedToBridge = bridgingModeInfo?.settings?.maxAmountAllowedToBridge || '0';
  const maxTokenAmountAllowedToBridge = bridgingModeInfo?.settings?.maxTokenAmountAllowedToBridge || '0';
  const supportedSourceTokenOptions = useSupportedSourceTokenOptions(chain, destinationChain);

  const fetchWalletFee = useCallback(async () => {
    if (!destinationAddr || !amount || !sourceToken) {
        setUserWalletFee(undefined);

        return;
    }

    try {
        if (isCardanoChain(chain)) {
            const feeResp = await getCardanoTxFee(destinationAddr, convertApexToDfm(amount || '0', chain), isWrappedToken(sourceToken));
            setUserWalletFee((feeResp?.fee || 0).toString());
            setBridgeTxFee((feeResp?.bridgingFee || 0).toString());

            return;
        } else if (isEvmChain(chain)) {
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
      if (!supportedSourceTokenOptions.some(x => x.value === sourceToken) && supportedSourceTokenOptions.length > 0) {
        setSourceToken(supportedSourceTokenOptions[0].value);
      }         
  }, [sourceToken, supportedSourceTokenOptions])

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

  const handleSourceTokenChange = useCallback((e: SelectChangeEvent<string>) => 
    {setSourceTokenCallback(e.target.value as TokenEnum);
  }, [setSourceTokenCallback]);

  const memoizedTokenIcon = useMemo(() => getTokenInfo(sourceToken).icon, [sourceToken]);

  // either for nexus(wei dfm), or prime&vector (lovelace dfm) units
  let minDfmValue: string;
  if (isEvmChain(chain)) {
    minDfmValue = convertDfmToWei(minValueToBridge);
  } else if (bridgingModeInfo.bridgingMode === BridgingModeEnum.Skyline) {
    minDfmValue = appSettings.minUtxoChainValue[chain];
  } else {
    minDfmValue = minValueToBridge;
  }
  
  const currencyMaxAmounts = calculateMaxAmountCurrency(
    totalDfmBalance, maxAmountAllowedToBridge, chain, changeMinUtxo, minDfmValue, bridgeTxFee, operationFee);
  const tokenMaxAmounts = calculateMaxAmountToken(totalDfmBalance, maxTokenAmountAllowedToBridge, chain, sourceToken);
  const maxAmounts = sourceToken && isWrappedToken(sourceToken)
    ? tokenMaxAmounts : currencyMaxAmounts;
  const currencyMaxAmount = minBigInt(currencyMaxAmounts.maxByAllowed, currencyMaxAmounts.maxByBalance);

  const onSubmit = useCallback(async () => {
    if (!sourceToken) return;
    await submit(destinationAddr, convertApexToDfm(amount || '0', chain), isWrappedToken(sourceToken))
  }, [amount, destinationAddr, submit, chain, sourceToken]) 

  return (
    <Box sx={{width:'100%'}}>
        <TotalBalance/>

        <Typography sx={{color:'white',mt:4, mb:2}}>Destination Address</Typography>
        {/* validate inputs */}
        <PasteTextInput sx={{width:'50%'}} text={destinationAddr} setText={setDestinationAddr} disabled={loading} id="dest-addr"/>
        {
          appSettings.isSkyline &&
          <Box sx={{ mt: '20px' }}>
              <Typography mb={'7px'} sx={{ color: white }}>Source Token</Typography>
              <CustomSelect
                  id="src-tokens"
                  label="SourceToken"
                  icon={memoizedTokenIcon}
                  value={sourceToken || ''}
                  onChange={handleSourceTokenChange}
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
                maxAmounts={maxAmounts}
                currencyMaxAmount={currencyMaxAmount}
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
                }}
                id="bridge-amount"/>

            <FeeInformation
                userWalletFee={userWalletFee || '0'}
                bridgeTxFee={bridgeTxFee || '0'}
                operationFee={operationFee || '0'}
                chain={chain}
                bridgingMode={bridgingModeInfo.bridgingMode}
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
                disabled={loading || currencyMaxAmount < 0}
                sx={{
                    gridColumn:'span 1',
                    textTransform:'uppercase'
                }}
                id="bridge-tx"
            >
                Move funds
            </ButtonCustom>
        </Box>
    </Box>
  )
}

export default BridgeInput
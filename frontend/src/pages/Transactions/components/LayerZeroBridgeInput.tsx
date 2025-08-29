import { Box, SelectChangeEvent, Typography } from '@mui/material'
import TotalBalance from "../components/TotalBalance";
import PasteTextInput from "../components/PasteTextInput";
import PasteApexAmountInput from "./PasteApexAmountInput";
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
import { getChainInfo, isCardanoChain, isEvmChain } from '../../../settings/chain';
import { getTokenInfo, isWrappedToken } from '../../../settings/token';

type BridgeInputType = {
    bridgeTxFee: string
    setBridgeTxFee: (val: string) => void
    resetBridgeTxFee: () => void
    operationFee: string
    getEthTxFee: (address: string, amount: string) => Promise<CreateEthTransactionResponseDto>
    submit:(address: string, amount: string) => Promise<void>
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

const BridgeInputLZ = ({bridgeTxFee, resetBridgeTxFee, operationFee, submit, loading}:BridgeInputType) => {
  const [destinationAddr, setDestinationAddr] = useState('');
  const [amount, setAmount] = useState('')
  const [userWalletFee, setUserWalletFee] = useState<string | undefined>();
  const [sourceToken, setSourceToken] = useState<TokenEnum | undefined>();
  const fetchCreateTxTimeoutRef = useRef<NodeJS.Timeout | undefined>();

  const walletUTxOs = useSelector((state: RootState) => state.accountInfo.utxos);
  const totalDfmBalance = useSelector((state: RootState) => state.accountInfo.balance);
  const {chain, destinationChain} = useSelector((state: RootState)=> state.chain);
  const minValueToBridge = useSelector((state: RootState) => state.settings.minValueToBridge)
  const maxAmountAllowedToBridge = useSelector((state: RootState) => state.settings.maxAmountAllowedToBridge)
  const maxTokenAmountAllowedToBridge = useSelector((state: RootState) => state.settings.maxTokenAmountAllowedToBridge)
  const supportedSourceTokenOptions = useSupportedSourceTokenOptions(chain, destinationChain);

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
  const minDfmValue = isEvmChain(chain)
    ? convertDfmToWei(minValueToBridge) 
    : appSettings.isSkyline 
      ? appSettings.minUtxoChainValue[chain]
      : minValueToBridge;
  
  const currencyMaxAmounts = calculateMaxAmountCurrency(
    totalDfmBalance, maxAmountAllowedToBridge, chain, changeMinUtxo, minDfmValue, bridgeTxFee, operationFee);
  const tokenMaxAmounts = calculateMaxAmountToken(totalDfmBalance, maxTokenAmountAllowedToBridge, chain, sourceToken);
  const maxAmounts = sourceToken && isWrappedToken(sourceToken)
    ? tokenMaxAmounts : currencyMaxAmounts;
  const currencyMaxAmount = minBigInt(currencyMaxAmounts.maxByAllowed, currencyMaxAmounts.maxByBalance);

  const onSubmit = useCallback(async () => {
    if (!sourceToken) return;
    await submit(destinationAddr, convertApexToDfm(amount || '0', chain))
  }, [amount, destinationAddr, submit, chain, sourceToken]) 

  return (
    <Box sx={{width:'100%'}}>
        <TotalBalance/>

<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, width: '100%', mt: 4 }}>
  {/* Destination address */}
  <Box>
    <Typography sx={{ color: 'white', mb: 1 }}>Destination Address</Typography>
    <PasteTextInput 
      sx={{ width: '100%' }} 
      text={destinationAddr} 
      setText={setDestinationAddr} 
      disabled={loading} 
      id="dest-addr" 
    />
  </Box>

  {/* Source Token (only if skyline) */}
  {appSettings.isSkyline && (
    <Box>
      <Typography sx={{ color: 'white', mb: 1 }}>Source Token</Typography>
      <CustomSelect
        id="src-tokens"
        label="SourceToken"
        icon={memoizedTokenIcon}
        value={sourceToken || ''}
        onChange={handleSourceTokenChange}
        options={supportedSourceTokenOptions}
        width="100%"
      />
    </Box>
  )}
</Box>

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
            

        </Box>
    </Box>
  )
}

export default BridgeInputLZ
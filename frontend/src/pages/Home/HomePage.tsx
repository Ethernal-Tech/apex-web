import React, { useCallback, useMemo } from "react";
import { useEffect } from 'react';
import { Typography, Box, Button, CircularProgress, SelectChangeEvent } from '@mui/material';
import CustomSelect from '../../components/customSelect/CustomSelect';
import { ReactComponent as SwitcherIcon } from '../../assets/switcher.svg';
import { ReactComponent as OneDirectionArrowIcon } from '../../assets/oneDirectionArrow.svg';
import BasePage from '../base/BasePage';
import BridgeGraph from "../../assets/Bridge-Graph.svg";
import { white } from "../../containers/theme";
import ButtonCustom from "../../components/Buttons/ButtonCustom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { useNavigate } from "react-router-dom";
import { NEW_TRANSACTION_ROUTE } from "../PageRouter";
import { setChainAction as setSrcChainAction, setDestinationChainAction as setDstChainAction } from "../../redux/slices/chainSlice";
import { ChainEnum } from "../../swagger/apexBridgeApiService";
import { login } from "../../actions/login";
import { getChainInfo} from "../../settings/chain";

const HomePage: React.FC = () => {
  const wallet = useSelector((state: RootState) => state.wallet.wallet);
  const loginConnecting = useSelector((state: RootState) => state.login.connecting);
  const account = useSelector((state: RootState) => state.accountInfo.account);
  const isLoggedInMemo = !!wallet && !!account;
  const enabledChains = useSelector((state: RootState) => state.settings.enabledChains);

  const allowedDirections = useSelector((state: RootState) => state.settings.allowedDirections);

  const navigate = useNavigate()
  const dispatch = useDispatch()
  
  const srcChain = useSelector((state: RootState) => state.chain.chain);
  const dstChain = useSelector((state: RootState) => state.chain.destinationChain);

  const srcChainOptions = useMemo(
    () => {
      const allowedSrc = Object.keys(allowedDirections) as ChainEnum[]; 
      return allowedSrc.filter(chain => enabledChains.includes(chain)).map(x => getChainInfo(x)); },
    [allowedDirections, enabledChains]);

  const dstChainOptions = useMemo(
    () => {
      const allowedDst = allowedDirections[srcChain] as ChainEnum[] || [] as ChainEnum[];
      return allowedDst.filter(chain => enabledChains.includes(chain)).map(x => getChainInfo(x));
    },
    [srcChain, enabledChains, allowedDirections]);

  const isSwitchBtnEnabled = useMemo(
    () => { 
      const allowedDstToSwap = allowedDirections[dstChain] as ChainEnum[] || [] as ChainEnum[];
      return !isLoggedInMemo && allowedDstToSwap.some(chain => chain === srcChain)
    },
    [srcChain, dstChain, isLoggedInMemo, allowedDirections]);

  const srcChainInfo = useMemo(() => getChainInfo(srcChain), [srcChain]);
  const dstChainInfo = useMemo(() => getChainInfo(dstChain), [dstChain]);

  const switchValues = useCallback(() => {
    const temp = srcChain;
    dispatch(setSrcChainAction(dstChain));
    dispatch(setDstChainAction(temp));
  }, [srcChain, dstChain, dispatch]);

  const onChangeSrcChain = useCallback(
    (evnt: SelectChangeEvent<string>) => dispatch(setSrcChainAction(evnt.target.value as ChainEnum)),
    [dispatch]);

  const onChangeDstChain = useCallback(
    (evnt: SelectChangeEvent<string>) => dispatch(setDstChainAction(evnt.target.value as ChainEnum)),
    [dispatch]);

  const handleConnectClick = useCallback(
    async () => {
      if (!enabledChains.includes(srcChain)) {
        console.error("chain not supported", srcChain)
        return
      }

      await login(srcChain, navigate, dispatch);
    },
    [srcChain, enabledChains, navigate, dispatch]);

  useEffect(() => {
    if ((!srcChain || !srcChainOptions.some(x => x.value === srcChain)) && srcChainOptions.length > 0) {
      dispatch(setSrcChainAction(srcChainOptions[0].value));
    }
  }, [srcChain, srcChainOptions, dispatch]);

  useEffect(() => {
    if ((!dstChain || !dstChainOptions.some(x => x.value === dstChain)) && dstChainOptions.length > 0) {
      dispatch(setDstChainAction(dstChainOptions[0].value));
    }
  }, [dstChain, dstChainOptions, dispatch]);

  return (
    <BasePage>
      <Typography variant="h1" sx={{ color: '#F25041', lineHeight: '', fontSize: '44px' }} fontFamily={'Major Mono Display, sans-serif'}>
        ReactoR bRidge
      </Typography>

      <img src={BridgeGraph} alt="apex bridge graph" style={{width:'280px',marginTop:'32px'}}/>

      <Box display="flex" alignItems="center" justifyContent="space-between" pt={2} pb={4}>
        <Box>
          <Typography mb={'7px'} fontWeight={500} sx={{color: white, fontSize:'13px'}}>SOURCE</Typography>
          <CustomSelect
            label="Source"
            icon={srcChainInfo.icon}
            value={srcChain}
            disabled={isLoggedInMemo}
            onChange={onChangeSrcChain}
            options={srcChainOptions}
            sx={{ width: '240px'}} // Setting minWidth via sx prop
          />
        </Box>
        <Button 
          onClick={switchValues} 
          disabled={!isSwitchBtnEnabled} 
          sx={{ 
            mt: '20px', 
            mx: '28px', 
            boxShadow: 'none', 
            background:'none' 
          }}>
            {!isLoggedInMemo ? <SwitcherIcon /> : <OneDirectionArrowIcon/>}
        </Button>
        <Box>
          <Typography mb={'7px'} fontWeight={500} sx={{color: white, fontSize:'13px'}}>DESTINATION</Typography>
          <CustomSelect
            label="Destination"
            icon={dstChainInfo.icon}
            value={dstChain}
            disabled={dstChainOptions.length < 2}
            onChange={onChangeDstChain}
            options={dstChainOptions}
            sx={{ width: '240px'}} // Setting minWidth via sx prop
          />
        </Box>
      </Box>
      {
        loginConnecting ? (
            <ButtonCustom 
              variant="white"
              sx={{ textTransform:'uppercase'}}
            >
                Connect Wallet
                <CircularProgress sx={{ marginLeft: 1 }} size={20}/>
            </ButtonCustom>
        ) : (
       !isLoggedInMemo ? (
        <ButtonCustom 
          id="bridge-connect"
          variant="white"
          sx={{ textTransform:'uppercase'}}
          onClick={handleConnectClick}>
            Connect Wallet
        </ButtonCustom>
      ): (
        <ButtonCustom 
          variant="white"
          sx={{ textTransform:'uppercase'}}
          onClick={()=> navigate(NEW_TRANSACTION_ROUTE)}
          id="move-funds">
            Move funds
        </ButtonCustom>
      )
    )}
    </BasePage>
  );
};

export default HomePage;

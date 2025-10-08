import React, { useCallback, useMemo } from "react";
import { useEffect } from 'react';
import { Typography, Box, Button, CircularProgress, SelectChangeEvent } from '@mui/material';
import CustomSelect from '../../components/customSelect/CustomSelect';
import { ReactComponent as SwitcherIcon } from '../../assets/switcher.svg';
import { ReactComponent as OneDirectionArrowIcon } from '../../assets/oneDirectionArrow.svg';
import BasePage from '../base/BasePage';
import BridgeGraph from "../../assets/Bridge-Graph.svg";
import SkylineBridgeGraph from "../../assets//skyline/Skyline-Bridge-Graph.png";
import { white } from "../../containers/theme";
import ButtonCustom from "../../components/Buttons/ButtonCustom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../redux/store";
import { useNavigate } from "react-router-dom";
import { NEW_TRANSACTION_ROUTE } from "../PageRouter";
import { setChainAction as setSrcChainAction, setDestinationChainAction as setDstChainAction } from "../../redux/slices/chainSlice";
import { ChainEnum } from "../../swagger/apexBridgeApiService";
import { login } from "../../actions/login";
import appSettings from "../../settings/appSettings";
import { getChainInfo, getSrcChains, getDstChains } from "../../settings/chain";

const HomePage: React.FC = () => {
  const wallet = useSelector((state: RootState) => state.wallet.wallet);
  const loginConnecting = useSelector((state: RootState) => state.login.connecting);
  const account = useSelector((state: RootState) => state.accountInfo.account);
  const isLoggedInMemo = !!wallet && !!account;
  const settings = useSelector((state: RootState) => state.settings)
  
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const {chain: srcChain, destinationChain: dstChain} = useSelector((state: RootState) => state.chain);

  const srcChainOptions = useMemo(
    () => getSrcChains(settings).map(x => getChainInfo(x)),
    [settings]);

  const dstChainOptions = useMemo(
    () => getDstChains(srcChain, settings).map(x => getChainInfo(x)),
    [srcChain, settings]);

  const isSwitchBtnEnabled = useMemo(
    () => !isLoggedInMemo && getDstChains(dstChain, settings).some(chain => chain === srcChain),
    [srcChain, dstChain, isLoggedInMemo, settings]);

  const srcChainInfo = useMemo(() => getChainInfo(srcChain), [srcChain]);
  const dstChainInfo = useMemo(() => getChainInfo(dstChain), [dstChain]);
  const color = appSettings.isSkyline ? "whiteSkyline" : "white";

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
    async() => {
      if (Object.keys(settings.allowedDirections).length > 0) {
        await login(srcChain, dstChain, navigate, settings, dispatch);
      }
    },
    [srcChain, dstChain, settings, navigate, dispatch]);

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
      <Typography
        variant="h1"
        sx={{
          color: appSettings.isSkyline ? '#FFFFFF' : '#F25041',
          lineHeight: '',
          fontSize: '44px',
          fontFamily: appSettings.isSkyline ? 'Goldman, sans-serif' : 'Major Mono Display, sans-serif'
        }}
      >
        {appSettings.isSkyline ? 'SKYLINE BRIDGE' : 'ReactoR bRidge'}
      </Typography>

      <img src={appSettings.isSkyline ? SkylineBridgeGraph : BridgeGraph} alt="apex bridge graph" style={{ height: '280px', marginTop: '32px' }} />

      <Box display="flex" alignItems="center" justifyContent="space-between" pt={2} pb={4}>
        <Box>
          <Typography mb={'7px'} fontWeight={500} sx={{ color: white, fontSize: '13px' }}>SOURCE</Typography>
          <CustomSelect
            label="Source"
            icon={srcChainInfo.icon}
            value={srcChainOptions.some(x => x.value === srcChain) ? srcChain : ""}
            disabled={isLoggedInMemo}
            onChange={onChangeSrcChain}
            options={srcChainOptions}
            sx={{ width: '240px' }} // Setting minWidth via sx prop
          />
        </Box>
        <Button
          onClick={switchValues}
          disabled={!isSwitchBtnEnabled}
          sx={{
            mt: '20px',
            mx: '28px',
            boxShadow: 'none',
            background: 'none'
          }}>
          {!isLoggedInMemo ? <SwitcherIcon /> : <OneDirectionArrowIcon />}
        </Button>
        <Box>
          <Typography mb={'7px'} fontWeight={500} sx={{ color: white, fontSize: '13px' }}>DESTINATION</Typography>
          <CustomSelect
            label="Destination"
            icon={dstChainInfo.icon}
            value={dstChainOptions.some(x => x.value === dstChain) ? dstChain : ""}
            disabled={(isLoggedInMemo && !appSettings.isMainnet) || dstChainOptions.length < 2}
            onChange={onChangeDstChain}
            options={dstChainOptions}
            sx={{ width: '240px' }} // Setting minWidth via sx prop
          />
        </Box>
      </Box>
      {
        loginConnecting ? (
          <ButtonCustom
            variant={color}
            sx={{ textTransform: 'uppercase' }}
          >
            Connect Wallet
            <CircularProgress sx={{ marginLeft: 1 }} size={20} />
          </ButtonCustom>
        ) : (
          !isLoggedInMemo ? (
            <ButtonCustom
              variant={color}
              sx={{ textTransform: 'uppercase' }}
              onClick={handleConnectClick}
              id="bridge-connect">
              Connect Wallet
            </ButtonCustom>
          ) : (
            <ButtonCustom
              variant={color}
              sx={{ textTransform: 'uppercase' }}
              onClick={() => navigate(NEW_TRANSACTION_ROUTE)}
              id="move-funds">
              Move funds
            </ButtonCustom>
          )
        )}
    </BasePage>
  );
};

export default HomePage;

import React, { useCallback, useMemo } from "react";
import { useEffect } from 'react';
import { Typography, Box, Button, CircularProgress } from '@mui/material';
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
  const enabledChains = useSelector((state: RootState) => state.settings.enabledChains);

  const navigate = useNavigate()
  const dispatch = useDispatch()

  const srcChain = useSelector((state: RootState) => state.chain.chain);
  const dstChain = useSelector((state: RootState) => state.chain.destinationChain);

  const srcChainOptions = useMemo(
    () => getSrcChains(appSettings.isSkyline).filter(chain => enabledChains.includes(chain.value)),
    [enabledChains]);

  const dstChainOptions = useMemo(
    () => getDstChains(appSettings.isSkyline, srcChain).filter(chain => enabledChains.includes(chain.value)),
    [srcChain, enabledChains]);

  const isSwitchBtnEnabled = useMemo(
    () => !isLoggedInMemo && getDstChains(appSettings.isSkyline, dstChain).some(x => x.value === srcChain),
    [srcChain, dstChain, isLoggedInMemo]);

  const srcChainInfo = useMemo(() => getChainInfo(srcChain), [srcChain]);
  const dstChainInfo = useMemo(() => getChainInfo(dstChain), [dstChain]);
  const color = appSettings.isSkyline ? "whiteSkyline" : "white";

  const switchValues = useCallback(() => {
    const temp = srcChain;
    dispatch(setSrcChainAction(dstChain));
    dispatch(setDstChainAction(temp));
  }, [srcChain, dstChain, dispatch]);

  const updateSrcChain = useCallback(
    (value: ChainEnum) => dispatch(setSrcChainAction(value)),
    [dispatch]);

  const updateDstChain = useCallback(
    (value: ChainEnum) => dispatch(setDstChainAction(value)),
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
      updateSrcChain(srcChainOptions[0].value)
    }
  }, [srcChain, srcChainOptions, updateSrcChain]);

  useEffect(() => {
    if ((!dstChain || !dstChainOptions.some(x => x.value === dstChain)) && dstChainOptions.length > 0) {
      updateDstChain(dstChainOptions[0].value)
    }
  }, [dstChain, dstChainOptions, updateDstChain]);

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
            value={srcChain}
            disabled={isLoggedInMemo}
            onChange={(e) => updateSrcChain(e.target.value as ChainEnum)}
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
            value={dstChain}
            disabled={srcChain !== ChainEnum.Prime || enabledChains.length <= 2}
            onChange={(e) => updateDstChain(e.target.value as ChainEnum)}
            // todo - makeshift fix, check out details later
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

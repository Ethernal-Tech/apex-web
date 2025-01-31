import React from "react";
import { Typography, Box, Button, CircularProgress } from '@mui/material';
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
import { getDestinationChain, getSelectedChain } from "../../utils/storageUtils";
import { setChainAction, setDestinationChainAction } from "../../redux/slices/chainSlice";
import { ChainEnum } from "../../swagger/apexBridgeApiService";
import { capitalizeWord, chainIcons } from "../../utils/generalUtils";
import { login } from "../../actions/login";
import appSettings from "../../settings/appSettings";

const reactorChainOptions = [
  { 
    value: ChainEnum.Prime,
    label: capitalizeWord(ChainEnum.Prime),
    icon: chainIcons[ChainEnum.Prime],
    borderColor:'#077368' 
  },
  { 
    value: ChainEnum.Vector,
    label: capitalizeWord(ChainEnum.Vector),
    icon: chainIcons[ChainEnum.Vector],
    borderColor:'#F25041'
  },
  { 
    value: ChainEnum.Nexus,
    label: capitalizeWord(ChainEnum.Nexus),
    icon: chainIcons[ChainEnum.Nexus],
    borderColor: '#F27B50'
  },
];

const skylineChainOptions = [
  { 
    value: ChainEnum.Prime,
    label: capitalizeWord(ChainEnum.Prime),
    icon: chainIcons[ChainEnum.Prime],
    borderColor:'#077368' 
  },
  { 
    value: ChainEnum.Cardano,
    label: capitalizeWord(ChainEnum.Cardano),
    icon: chainIcons[ChainEnum.Cardano],
    borderColor: '#0538AF'
  }
];

const HomePage: React.FC = () => {
  const wallet = useSelector((state: RootState) => state.wallet.wallet);
  const loginConnecting = useSelector((state: RootState) => state.login.connecting);
  const account = useSelector((state: RootState) => state.accountInfo.account);
	const isLoggedInMemo = !!wallet && !!account;

  const navigate = useNavigate()
  const dispatch = useDispatch()
  
  const chain = useSelector((state: RootState) => state.chain.chain);
  const destinationChain = useSelector((state: RootState) => state.chain.destinationChain);

  const supportedChainOptions = appSettings.isSkyline ? skylineChainOptions : reactorChainOptions;

  // if new source is the same as destination, switch the chains
  const updateSource = (value: ChainEnum)=>{
    const destination = getDestinationChain()
    if(value === destination) return switchValues()
    dispatch(setChainAction(value))
  }
  
  // if new destination is the same as source, switch the chains
  const updateDestination = (value: ChainEnum)=>{
    const source = getSelectedChain()
    if(value === source) return switchValues()
    dispatch(setDestinationChainAction(value))
  }

  const switchValues = () => {
    const temp = chain;
    dispatch(setChainAction(destinationChain));
    dispatch(setDestinationChainAction(temp));
  };

  const handleConnectClick = async () => {
    await login(chain, navigate, dispatch);
  }

  const getIconComponent = (value: string): React.FC => {
    const option = supportedChainOptions.find(opt => opt.value === value);
    return option ? option.icon : chainIcons[ChainEnum.Prime]; // Default to PrimeIcon if not found
  };

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

      <img src={BridgeGraph} alt="apex bridge graph" style={{width:'280px',marginTop:'32px'}}/>

      <Box display="flex" alignItems="center" justifyContent="space-between" pt={2} pb={4}>
        <Box>
          <Typography mb={'7px'} fontWeight={500} sx={{color: white, fontSize:'13px'}}>SOURCE</Typography>
          <CustomSelect
            label="Source"
            icon={getIconComponent(chain)}
            value={chain}
            disabled={isLoggedInMemo}
            onChange={(e) => updateSource(e.target.value as ChainEnum)}
            options={supportedChainOptions}
            sx={{ width: '240px'}} // Setting minWidth via sx prop
          />
        </Box>
        <Button 
          onClick={switchValues} 
          disabled={isLoggedInMemo} 
          sx={{ 
            mt: '20px', 
            mx:'28px', 
            boxShadow: 'none', 
            background:'none' 
          }}>
            {!isLoggedInMemo ? <SwitcherIcon /> : <OneDirectionArrowIcon/>}
        </Button>
        <Box>
          <Typography mb={'7px'} fontWeight={500} sx={{color: white, fontSize:'13px'}}>DESTINATION</Typography>
          <CustomSelect
            label="Destination"
            icon={getIconComponent(destinationChain)}
            value={destinationChain}
            disabled={appSettings.isSkyline || chain !== ChainEnum.Prime}
            onChange={(e) => updateDestination(e.target.value as ChainEnum)}
            // todo - makeshift fix, check out details later
            options={supportedChainOptions.filter(x => {
              // if source chain not prime, destination can only be prime
              if(chain !== ChainEnum.Prime){
                // set destination chain to prime if not already
                if(destinationChain !== ChainEnum.Prime) dispatch(setDestinationChainAction(ChainEnum.Prime));
                return x.value === ChainEnum.Prime
              }
              return x.value !== chain
              
            })}
            sx={{ width: '240px'}} // Setting minWidth via sx prop
          />
        </Box>
      </Box>
      {
        loginConnecting ? (
            <ButtonCustom 
              variant={appSettings.isSkyline ? "whiteSkyline" : "white"}
              sx={{ textTransform:'uppercase'}}
            >
                Connect Wallet
                <CircularProgress sx={{ marginLeft: 1 }} size={20}/>
            </ButtonCustom>
        ) : (
       !isLoggedInMemo ? (
        <ButtonCustom 
          variant={appSettings.isSkyline ? "whiteSkyline" : "white"}
          sx={{ textTransform:'uppercase'}}
          onClick={handleConnectClick}>
            Connect Wallet
        </ButtonCustom>
      ): (
        <ButtonCustom 
          variant={appSettings.isSkyline ? "whiteSkyline" : "white"}
          sx={{ textTransform:'uppercase'}}
          onClick={()=> navigate(NEW_TRANSACTION_ROUTE)}>
            Move funds
        </ButtonCustom>
      )
    )}
    </BasePage>
  );
};

export default HomePage;

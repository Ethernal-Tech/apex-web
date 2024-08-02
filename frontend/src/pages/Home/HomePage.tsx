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

const HomePage: React.FC = () => {
  const wallet = useSelector((state: RootState) => state.wallet.wallet);
  const loginConnecting = useSelector((state: RootState) => state.login.connecting);
  const account = useSelector((state: RootState) => state.accountInfo.account);
	const isLoggedInMemo = !!wallet && !!account;

  const navigate = useNavigate()
  const dispatch = useDispatch()
  
  const chain = useSelector((state: RootState) => state.chain.chain);
  const destinationChain = useSelector((state: RootState) => state.chain.destinationChain);

  const supportedChainOptions = [
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
    // TODO af - nexus removed for now
    { 
      value: ChainEnum.Nexus,
      label: capitalizeWord(ChainEnum.Nexus),
      icon: chainIcons[ChainEnum.Nexus],
      borderColor: '#F27B50'
    }
  ];


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
      <Typography variant="h1" sx={{ color: '#F25041', lineHeight: '128px', fontSize: '64px' }} fontFamily={'Major Mono Display, sans-serif'}>
        Apex bRidGe
      </Typography>

      <img src={BridgeGraph} alt="apex bridge graph" />

      <Box display="flex" alignItems="center" justifyContent="space-between" p={4}>
        <Box>
          <Typography mb={1} sx={{color: white}} fontWeight="bold">SOURCE</Typography>
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
          <Typography mb={1} sx={{color: white}} fontWeight="bold">DESTINATION</Typography>
          <CustomSelect
            label="Destination"
            icon={getIconComponent(destinationChain)}
            value={destinationChain}
            disabled={chain !== ChainEnum.Prime}
            onChange={(e) => updateDestination(e.target.value as ChainEnum)}
            options={supportedChainOptions.filter(x => x.value !== chain)}
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
          variant="white"
          sx={{ textTransform:'uppercase'}}
          onClick={handleConnectClick}>
            Connect Wallet
        </ButtonCustom>
      ): (
        <ButtonCustom 
          variant="white"
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

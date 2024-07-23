import React from "react";
import { Typography, Box, Button } from '@mui/material';
import CustomSelect from '../../components/customSelect/CustomSelect';
import { ReactComponent as PrimeIcon } from '../../assets/chain-icons/prime.svg';
import { ReactComponent as VectorIcon } from '../../assets/chain-icons/vector.svg';
// import { ReactComponent as NexusIcon } from '../../assets/chain-icons/nexus.svg';
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

const HomePage: React.FC = () => {
  const walletState = useSelector((state: RootState) => state.wallet);
    const isLoggedInMemo = !!walletState.wallet;

  const navigate = useNavigate()
  const dispatch = useDispatch()
  
  const chainState = useSelector((state: RootState) => state.chain);
  const chain = chainState.chain
  const destinationChain = chainState.destinationChain

  const options = [
    { 
      value: 'prime',
      label: 'Prime',
      icon: PrimeIcon,
      borderColor:'#077368' 
    },
    { 
      value: 'vector', 
      label: 'Vector', 
      icon: VectorIcon,
      borderColor:'#F25041'
    },
    // TODO af - nexus removed for now
    /* { 
      value: 'nexus',
      label: 'Nexus',
      icon: NexusIcon,
      borderColor: '#F27B50'
    } */
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
    console.log('switch')
    const temp = chain;
    dispatch(setChainAction(destinationChain));
    dispatch(setDestinationChainAction(temp));
  };

  const getIconComponent = (value: string): React.FC => {
    const option = options.find(opt => opt.value === value);
    return option ? option.icon : PrimeIcon; // Default to PrimeIcon if not found
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
            disabled={isLoggedInMemo ? true : false}
            onChange={(e) => updateSource(e.target.value as ChainEnum)}
            options={options}
            sx={{ width: '240px'}} // Setting minWidth via sx prop
          />
        </Box>
        <Button 
          onClick={switchValues} 
          disabled={isLoggedInMemo ? true : false} 
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
            disabled={isLoggedInMemo ? true : false}
            onChange={(e) => updateDestination(e.target.value as ChainEnum)}
            options={options}
            sx={{ width: '240px'}} // Setting minWidth via sx prop
          />
        </Box>
      </Box>

      { !isLoggedInMemo ? (
        <ButtonCustom 
          variant="white"
          sx={{ textTransform:'uppercase'}}>
            Connect Wallet
        </ButtonCustom>
      ): (
        <ButtonCustom 
          variant="white"
          sx={{ textTransform:'uppercase'}}
          // TODO - this leads to the old design of the "new transaction" page, should be updated
          onClick={()=> navigate(NEW_TRANSACTION_ROUTE)}>
            Move funds
        </ButtonCustom>
      )}
    </BasePage>
  );
};

export default HomePage;

import React, { useMemo, useState } from "react";
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
import { setDestinationNetworktAction, setSourceNetworktAction } from "../../redux/slices/networkSlice";
import { getDestinationNetwork, getSourceNetwork } from "../../utils/storageUtils";

const HomePage: React.FC = () => {
  const tokenState = useSelector((state: RootState) => state.token);
	
	const isLoggedInMemo = useMemo(
		() => {
			return tokenState.token;
		},
		[tokenState]
	)

  const navigate = useNavigate()
  const dispatch = useDispatch()
  
  const networkState = useSelector((state: RootState) => state.network);
  const {source, destination} = networkState.network
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
  const updateSource = (value:string)=>{
    const destination = getDestinationNetwork()
    if(value === destination) return switchValues()
    dispatch(setSourceNetworktAction(value))
  }
  
  // if new destination is the same as source, switch the chains
  const updateDestination = (value:string)=>{
    const source = getSourceNetwork()
    if(value === source) return switchValues()
    dispatch(setDestinationNetworktAction(value))
  }

  const switchValues = () => {
    const temp = source;
    dispatch(setSourceNetworktAction(destination));
    dispatch(setDestinationNetworktAction(temp));
  };

  const getIconComponent = (value: string): React.FC => {
    const option = options.find(opt => opt.value === value);
    return option ? option.icon : PrimeIcon; // Default to PrimeIcon if not found
  };

  return (
    <BasePage>
      <Typography variant="h1" sx={{ color: '#F25041', lineHeight: '128px', fontSize: '64px' }} fontFamily={'Major Mono Display, sans-serif'}>
        Apex bridge
      </Typography>

      <img src={BridgeGraph} alt="apex bridge graph" />

      <Box display="flex" alignItems="center" justifyContent="space-between" p={4}>
        <Box>
          <Typography mb={1} sx={{color: white}} fontWeight="bold">SOURCE</Typography>
          <CustomSelect
            label="Source"
            icon={getIconComponent(source)}
            value={source}
            disabled={isLoggedInMemo ? true : false}
            onChange={(e) => updateSource(e.target.value)}
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
            icon={getIconComponent(destination)}
            value={destination}
            disabled={isLoggedInMemo ? true : false}
            onChange={(e) => updateDestination(e.target.value)}
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

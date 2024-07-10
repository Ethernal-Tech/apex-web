import React, { useState } from "react";
import { Typography, Box, Button } from '@mui/material';
import CustomSelect from '../../components/customSelect/CustomSelect';
import { ReactComponent as PrimeIcon } from '../../assets/chain-icons/prime.svg';
import { ReactComponent as VectorIcon } from '../../assets/chain-icons/vector.svg';
import { ReactComponent as NexusIcon } from '../../assets/chain-icons/nexus.svg';
import { ReactComponent as SwitcherIcon } from '../../assets/switcher.svg';
import BasePage from '../base/BasePage';
import BridgeGraph from "../../assets/Bridge-Graph.svg";
import { menuDark, white } from "../../containers/theme";

const HomePage: React.FC = () => {
  const [source, setSource] = useState('prime');
  const [destination, setDestination] = useState('vector');

  const options = [
    { value: 'prime', label: 'Prime', icon: PrimeIcon },
    { value: 'vector', label: 'Vector', icon: VectorIcon },
    { value: 'nexus', label: 'Nexus', icon: NexusIcon },
  ];

  const switchValues = () => {
    const temp = source;
    setSource(destination);
    setDestination(temp);
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
          <Box mb={1} fontWeight="bold">SOURCE</Box>
          <CustomSelect
            label="Source"
            icon={getIconComponent(source)}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            options={options}
            sx={{ minWidth: 200 }} // Setting minWidth via sx prop
          />
        </Box>
        <Button onClick={switchValues} sx={{ mt: '20px', mx:'28px', boxShadow: 'none', background:'none' }}>
          <SwitcherIcon />
        </Button>
        <Box>
          <Box mb={1} fontWeight="bold">DESTINATION</Box>
          <CustomSelect
            label="Destination"
            icon={getIconComponent(destination)}
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            options={options}
            sx={{ minWidth: 200 }} // Setting minWidth via sx prop
          />
        </Box>
      </Box>

      {/* TODO AF - hide button when user is logged in, or show a bridge button, or hide (depends on product) */}
      <Button sx={{backgroundColor:white, color: menuDark}}>
        Connect Wallet
      </Button>
    </BasePage>
  );
};

export default HomePage;

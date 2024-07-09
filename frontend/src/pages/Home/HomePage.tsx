import BasePage from '../base/BasePage';
import BridgeGraph from "../../assets/Bridge-Graph.svg";
import { Typography, Box } from '@mui/material';

// TODO AF - this is not ready yet
// TODO AF - add is loading here for spinner
const TransactionsTablePage = () => {
  return (
    <BasePage>
            <Typography variant="h1" sx={{ color: '#F25041', lineHeight:'128px', fontSize:'64px' }} fontFamily={'Major Mono Display, sans-serif'}>
              Apex bridge
            </Typography>
            <img src={BridgeGraph} alt="apex bridge graph" />
    </BasePage>
  );
};

export default TransactionsTablePage;

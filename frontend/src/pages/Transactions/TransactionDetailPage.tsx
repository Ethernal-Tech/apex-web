import { Link as RouterLink,useParams } from 'react-router-dom';
import { getTransactionById } from '../../features/bridgeTransactions';
import { Box, Link, Typography } from '@mui/material';
import BasePage from '../base/BasePage';
import { useEffect, useState } from 'react';
import { BridgeTransactionType } from '../../features/types';
import VerticalStepper from '../../components/stepper/VerticalStepper';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FullPageSpinner from '../../components/spinner/Spinner';
import { HOME_ROUTE } from '../PageRouter';
import { TransactionStatus } from '../../features/enums';

const TransactionDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [transaction, setTransaction] = useState<BridgeTransactionType | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        if (id) {
          const transactionDetails = await getTransactionById(id);
          transactionDetails && setTransaction(transactionDetails);
        }
      } catch (error) {
        console.error(error);
      }
    })();
  }, [id]);

  return (
    <BasePage>
      {!!!transaction && <FullPageSpinner />}
      <Box sx={{ mb: 2, display: 'flex', alignSelf: 'start' }}>
        <Box>
          <Link component={RouterLink} to={HOME_ROUTE} sx={{ mr: 1, color: 'inherit', textDecoration: 'none', display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Typography variant="body1">
              <ArrowBackIcon />
            </Typography>
          <Typography variant="body1">
            Back to transactions
          </Typography>
          </Link>
        </Box>
      </Box>
      <Box sx={{ my: 2 }}>
        <Typography variant="h2">Transaction Details</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 20, mt: 5 }}>
          <Box sx={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2">
                Origin Chain:
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{transaction?.originChain}</Typography>
            </Box>
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2">
                Destination Chain:
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{transaction?.destinationChain}</Typography>
            </Box>
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2">Amount:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{transaction?.amount}</Typography>
            </Box>
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2">Date:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{transaction?.date}</Typography>
            </Box>
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2">Status:</Typography>
              <Typography variant="body1" sx={{
                fontWeight: 'bold',
                color: (transaction?.status === TransactionStatus.Success ? 'green' : (transaction?.status === TransactionStatus.Rejected ? 'red' : 'gray')),
                textTransform: 'uppercase'
              }}>{transaction?.status}</Typography>
            </Box>
          </Box>
          <Box sx={{ flex: '1 1 50%', display: 'flex', justifyContent: 'center' }}>
            {transaction && <VerticalStepper steps={transaction?.steps}/>}
          </Box>
        </Box>
      </Box>
    </BasePage>
  );
};

export default TransactionDetailPage;

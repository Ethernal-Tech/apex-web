import { Link as RouterLink,useParams } from 'react-router-dom';
import { Box, Link, Typography } from '@mui/material';
import BasePage from '../base/BasePage';
import { useEffect, useState } from 'react';
import VerticalStepper from '../../components/stepper/VerticalStepper';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FullPageSpinner from '../../components/spinner/Spinner';
import { HOME_ROUTE } from '../PageRouter';
import { BridgeTransactionControllerClient, BridgeTransactionDto, TransactionStatusEnum } from '../../swagger/apexBridgeApiService';

const TransactionDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [transaction, setTransaction] = useState<BridgeTransactionDto | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        if (id) {
          const bridgeClient = new BridgeTransactionControllerClient();
          const transactionDetails = await bridgeClient.get(Number(id));
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
              <Typography variant="subtitle2">Sender address:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{transaction?.senderAddress}</Typography>
            </Box>
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2">Receiver address:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{transaction?.receiverAddress}</Typography>
            </Box>
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2">Date created:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{transaction?.createdAt.toLocaleDateString()}</Typography>
            </Box>
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2">Date finished:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{transaction?.finishedAt?.toLocaleDateString() || "/"}</Typography>
            </Box>
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2">Status:</Typography>
              <Typography variant="body1" sx={{
                fontWeight: 'bold',
                color: (transaction?.status === TransactionStatusEnum.Success ? 'green' : (transaction?.status === TransactionStatusEnum.Failed ? 'red' : 'gray')),
                textTransform: 'uppercase'
              }}>{transaction?.status}</Typography>
            </Box>
          </Box>
          <Box sx={{ flex: '1 1 50%', display: 'flex', justifyContent: 'center' }}>
            {/* {transaction && <VerticalStepper steps={transaction?.steps}/>} */}
          </Box>
        </Box>
      </Box>
    </BasePage>
  );
};

export default TransactionDetailPage;

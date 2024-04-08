import { useState, useRef, MouseEvent, ChangeEvent, useEffect } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Chip, TablePagination } from '@mui/material';
import {bridgeTransactions, getBridgeTransactions} from '../../features/bridgeTransactions';
import BasePage from '../base/BasePage';
import { useNavigate } from 'react-router-dom';
import { BridgeTransactionType } from '../../features/types';
import FullPageSpinner from '../../components/spinner/Spinner';
import { TransactionStatus } from '../../features/enums';

const TransactionsTablePage = () => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [visibleTransactions, setVisibleTransactions] = useState<BridgeTransactionType[] | undefined>();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        (async () => {
          try {
            setIsLoading(true);
            const transactions = await getBridgeTransactions(page, rowsPerPage);
            if (transactions) {
                setVisibleTransactions(transactions);
            }
          } catch (error) {
            console.error(error);
          } finally {
            setIsLoading(false);
          }
        })();
      }, [page, rowsPerPage]);

    const handleChangePage = (
        event: MouseEvent<HTMLButtonElement> | null,
        newPage: number,
      ) => {
        setPage(newPage);
      };

      const handleChangeRowsPerPage = (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
      };

  const tableRef = useRef(null);
  const navigate = useNavigate();

  return (
    <BasePage>
    {isLoading && <FullPageSpinner />}
    <TableContainer component={Paper}  ref={tableRef}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Origin Chain</TableCell>
            <TableCell>Destination Chain</TableCell>
            <TableCell>Amount</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visibleTransactions?.map((transaction, index) => (
            <TableRow key={`tx-${index}`}>
              <TableCell>{transaction.originChain}</TableCell>
              <TableCell>{transaction.destinationChain}</TableCell>
              <TableCell>{transaction.amount}</TableCell>
              <TableCell>{transaction.date}</TableCell>
              <TableCell>
                <Chip 
                  label={transaction.status}
                  sx={{
                    bgcolor: transaction.status === TransactionStatus.Success ? 'green' : (transaction?.status === TransactionStatus.Rejected ? 'red' : 'gray'),
                    color: 'white',
                    textTransform: 'uppercase'
                  }}
                />
              </TableCell>
              <TableCell>
                <Button variant="contained" color="primary" onClick={() => navigate(`/transaction/${transaction.id}`)}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    <TablePagination
          component="div"
          count={bridgeTransactions.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
    />
    </BasePage>
  );
};

export default TransactionsTablePage;

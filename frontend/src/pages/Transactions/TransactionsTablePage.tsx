import { useState, useRef, MouseEvent, ChangeEvent, useEffect } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Chip, TablePagination, Box, SelectChangeEvent, TableSortLabel } from '@mui/material';
import BasePage from '../base/BasePage';
import { useNavigate } from 'react-router-dom';
import FullPageSpinner from '../../components/spinner/Spinner';
import { BridgeTransactionControllerClient, BridgeTransactionDto, BridgeTransactionFilterDto, TransactionStatusEnum } from '../../swagger/apexBridgeApiService';
import Filters from '../../components/filters/Filters';
import { transformFilters } from '../../utils/typeUtils';
import { visuallyHidden } from '@mui/utils';
import { headCells } from './tableConfig';

const TransactionsTablePage = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order] = useState<'asc' | 'desc' | undefined>('desc');
  const [orderBy] = useState('createdAt');
  const [visibleTransactions, setVisibleTransactions] = useState<BridgeTransactionDto[] | undefined>();
  const [numberOfTransactions, setNumberOfTransactions] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const tableRef = useRef(null);
  const navigate = useNavigate();

  const initialFilters = {
    receiverAddress: '',
    destinationChain: '',
    amountFrom: '',
    amountTo: '',
    page: page,
    perPage: rowsPerPage,
    order: order,
    orderBy: orderBy,
  }; 
  
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);

    function resetFilters() {
      setAppliedFilters(initialFilters);
      setFilters(initialFilters);
    }

    const handleFilterChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
        setFilters({
            ...filters,
            [event.target.name]: event.target.value
        });
    }

    function applySelectedFilters() {
      setAppliedFilters({...filters});
    }

    const handleAppliedFilterChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
      setAppliedFilters({
        ...appliedFilters,
        [event.target.name]: event.target.value
    });
  }

    const getBridgeTransactions = async () => {
      try {
        setIsLoading(true);
        const bridgeClient = new BridgeTransactionControllerClient();
        const transformedFilters = transformFilters(filters);

        const response = await bridgeClient.getAllFiltered(new BridgeTransactionFilterDto(transformedFilters));
        if (response.entities) {
            setVisibleTransactions(response.entities);
            setNumberOfTransactions(response.total);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
    
    useEffect(() => {
      getBridgeTransactions();
      }, [
        filters.page,
        filters.perPage,
        filters.order,
        filters.orderBy,
        appliedFilters.receiverAddress,
        appliedFilters.destinationChain,
        appliedFilters.amountFrom,
        appliedFilters.amountTo
      ]
    );

    const handleChangePage = (
        event: MouseEvent<HTMLButtonElement> | null,
        newPage: number,
      ) => {
        setPage(newPage);
        setFilters({
          ...filters,
          page: newPage + 1
        });
        
      };
      
  const handleChangeRowsPerPage = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setFilters({
      ...filters,
      page: 1,
      perPage: parseInt(event.target.value)
    });
    setPage(0);
  };

  const createSortHandler =
    (property: string) => (event: React.MouseEvent<unknown>) => {
      const isAsc = filters.orderBy === property && filters.order === 'asc';
      setFilters({
        ...filters,
        page: 1,
        order: isAsc ? 'desc' : 'asc',
        orderBy: property
      });
      setPage(0);
    };

  return (
    <BasePage>
    {isLoading && <FullPageSpinner />}
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Filters
          filters={transformFilters(filters)}
          appliedFilters={transformFilters(appliedFilters)}
          handleAppliedFilterChange={handleAppliedFilterChange}
          handleFilterChange={handleFilterChange}
          applySelectedFilters={applySelectedFilters}
          getFilteredBridgeTransactions={getBridgeTransactions}
          resetFilters={resetFilters}
        />
      </Box>
    <TableContainer component={Paper}  ref={tableRef}>
      <Table>
        <TableHead>
          <TableRow>
          {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            padding='normal'
            sortDirection={filters.orderBy === headCell.id ? filters.order : false}
            sx={{ cursor: 'default' }}
          >
              {
                headCell.id === 'actions' ?
                  headCell.label :
                  <TableSortLabel
                    active={filters.orderBy === headCell.id}
                    direction={filters.orderBy === headCell.id ? filters.order : 'asc'}
                    onClick={createSortHandler(headCell.id)}
                  >
                    {headCell.label}
                    {filters.orderBy === headCell.id ? (
                      <Box component="span" sx={visuallyHidden}>
                        {filters.order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                      </Box>
                    ) : null}
                  </TableSortLabel>
              }
          </TableCell>
        ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {visibleTransactions?.map((transaction, index) => (
            <TableRow key={`tx-${index}`}>
              <TableCell>{transaction.originChain}</TableCell>
              <TableCell>{transaction.destinationChain}</TableCell>
              <TableCell>{transaction.amount}</TableCell>
              <TableCell>{transaction.receiverAddress}</TableCell>
              <TableCell>{transaction.createdAt.toLocaleString()}</TableCell>
              <TableCell sx={{ textAlign: transaction.finishedAt ? 'left' : 'center'}}>{transaction.finishedAt?.toLocaleString() || "/"}</TableCell>
              <TableCell>
                <Chip 
                  label={transaction.status}
                  sx={{
                    bgcolor: transaction.status === TransactionStatusEnum.Success ? 'green' : (transaction?.status === TransactionStatusEnum.Failed ? 'red' : 'gray'),
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
    {!!numberOfTransactions &&<TablePagination
          component="div"
          count={numberOfTransactions}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
    />}
    </BasePage>
  );
};

export default TransactionsTablePage;

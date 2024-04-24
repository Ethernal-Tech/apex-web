import { useState, useRef, MouseEvent, ChangeEvent, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Chip, TablePagination, Box, TableSortLabel, SortDirection } from '@mui/material';
import BasePage from '../base/BasePage';
import { useNavigate } from 'react-router-dom';
import FullPageSpinner from '../../components/spinner/Spinner';
import { BridgeTransactionFilterDto, BridgeTransactionResponseDto } from '../../swagger/apexBridgeApiService';
import Filters from '../../components/filters/Filters';
import { visuallyHidden } from '@mui/utils';
import { headCells } from './tableConfig';
import { getAllFilteredAction } from './action';
import { useTryCatchJsonByAction } from '../../utils/fetchUtils';
import { getStatusColor } from '../../utils/statusUtils';

const TransactionsTablePage = () => {
	const [transactions, setTransactions] = useState<BridgeTransactionResponseDto | undefined>(undefined);
	const [isLoading, setIsLoading] = useState(false);
	const tableRef = useRef(null);
	const navigate = useNavigate();
	const fetchFunction = useTryCatchJsonByAction();
	
	const [filters, setFilters] = useState(new BridgeTransactionFilterDto());

    const fetchDataCallback = useCallback(
		async () => {
			setIsLoading(true);
			const bindedAction = getAllFilteredAction.bind(null, filters);
			const response = await fetchFunction(bindedAction);
			setTransactions(response);
			setIsLoading(false);
		},
		[filters, fetchFunction]
	)

	useEffect(
		() => {
			fetchDataCallback();
		},
		[fetchDataCallback]
	)

	const handleChangePage = (
		event: MouseEvent<HTMLButtonElement> | null,
		page: number,
	) => {
		setFilters(state => new BridgeTransactionFilterDto({
			...state,
			page
		}));
			
	};
		
	const handleChangeRowsPerPage = (
		event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		setFilters(state => new BridgeTransactionFilterDto({
			...state,
			page: 0,
			perPage: parseInt(event.target.value)
		}));
	};

	const createSortHandler =
		(property: string) => (event: React.MouseEvent<unknown>) => {
			const isAsc = filters.orderBy === property && filters.order === 'asc';
			setFilters(new BridgeTransactionFilterDto({
				...filters,
				page: 0,
				order: isAsc ? 'desc' : 'asc',
				orderBy: property
			})
		);
	};

	

  return (
    <BasePage>
    {isLoading && <FullPageSpinner />}
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Filters
          filters={filters}
          onFilterChange={setFilters}
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
            sortDirection={filters.orderBy === headCell.id ? filters.order as SortDirection : false}
            sx={{ cursor: 'default' }}
          >
              {
                headCell.id === 'actions' ?
                  headCell.label :
                  <TableSortLabel
                    active={filters.orderBy === headCell.id}
                    direction={filters.orderBy === headCell.id ? filters.order as "desc" | "asc" : 'asc'}
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
          {transactions?.items.map((transaction, index) => (
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
                    bgcolor: getStatusColor(transaction.status),
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
    {!!transactions?.total &&<TablePagination
          component="div"
          count={transactions.total}
          page={transactions.page}
          rowsPerPage={transactions.perPage}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
    />}
    </BasePage>
  );
};

export default TransactionsTablePage;

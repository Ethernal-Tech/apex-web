import { useState, useRef, MouseEvent, ChangeEvent, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Chip, TablePagination, Box, TableSortLabel, SortDirection, Typography } from '@mui/material';
import BasePage from '../base/BasePage';
import { useNavigate } from 'react-router-dom';
import FullPageSpinner from '../../components/spinner/Spinner';
import { BridgeTransactionFilterDto, BridgeTransactionResponseDto } from '../../swagger/apexBridgeApiService';
import Filters from '../../components/filters/Filters';
import { visuallyHidden } from '@mui/utils';
import { headCells } from './tableConfig';
import { getAllFilteredAction } from './action';
import { useTryCatchJsonByAction } from '../../utils/fetchUtils';
import { getStatusColor, getStatusIconAndLabel, getStatusText, isStatusFinal } from '../../utils/statusUtils';
import { capitalizeWord, dfmToApex, formatAddress, getChainLabelAndColor } from '../../utils/generalUtils';

const TransactionsTablePage = () => {
	const [transactions, setTransactions] = useState<BridgeTransactionResponseDto | undefined>(undefined);
	const [isLoading, setIsLoading] = useState(false);
	const tableRef = useRef(null);
	const navigate = useNavigate();
	const fetchFunction = useTryCatchJsonByAction();
	
	const [filters, setFilters] = useState(new BridgeTransactionFilterDto());

    const fetchDataCallback = useCallback(
		async (hideLoading: boolean = false) => {
			!hideLoading && setIsLoading(true);
			const bindedAction = getAllFilteredAction.bind(null, filters);
			const response = await fetchFunction(bindedAction);
			setTransactions(response);
			!hideLoading && setIsLoading(false);

      return response
		},
		[filters, fetchFunction]
	)

	useEffect(
		() => {
			fetchDataCallback();
		},
		[fetchDataCallback]
	)

  useEffect(
    () => {
      const handle = setInterval(async () => {
        const resp = await fetchDataCallback(true);
        if (resp.items.every(x => isStatusFinal(x.status))) {
          clearInterval(handle);
        }
      }, 5000);

      return () => {
        clearInterval(handle);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
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
          {transactions?.items.map((transaction) => (
            <TableRow key={`tx-${transaction.id}`}>
              <TableCell>
                <Box component="span" sx={{
                  display: 'inline-block',
                  color: 'white',
                  bgcolor: getChainLabelAndColor(transaction.originChain).color,
                  borderRadius: '50%',
                  width: 24,
                  height: 24,
                  textAlign: 'center',
                  lineHeight: '24px',
                  marginRight: 1,
                }}>
                  {getChainLabelAndColor(transaction.originChain).letter}
                </Box>
                {capitalizeWord(transaction.originChain)}
              </TableCell>
              <TableCell>
                <Box component="span" sx={{
                  display: 'inline-block',
                  color: 'white',
                  bgcolor: getChainLabelAndColor(transaction.destinationChain).color,
                  borderRadius: '50%',
                  width: 24,
                  height: 24,
                  textAlign: 'center',
                  lineHeight: '24px',
                  marginRight: 1,
                }}>
                  {getChainLabelAndColor(transaction.destinationChain).letter}
                </Box>
                {capitalizeWord(transaction.destinationChain)}
              </TableCell>
              <TableCell>{dfmToApex(transaction.amount)} APEX</TableCell>
              <TableCell>{formatAddress(transaction.receiverAddresses)}</TableCell>
              <TableCell>{transaction.createdAt.toLocaleString()}</TableCell>
              <TableCell sx={{ textAlign: transaction.finishedAt ? 'left' : 'center'}}>{transaction.finishedAt?.toLocaleString() || "/"}</TableCell>
              <TableCell sx={{display:'flex'}}>
                <Box sx={{marginRight:1}} component='img' src={getStatusIconAndLabel(transaction.status).icon || ''} alt=''/>
                <Typography sx={{textTransform:'capitalize', display:'inline-block'}}>
                  {getStatusIconAndLabel(transaction.status).label}
                </Typography>
              </TableCell>
              <TableCell>
                <Button variant="text" sx={{color:'red', background:'none'}} onClick={() => navigate(`/transaction/${transaction.id}`)}>
                  View Details
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

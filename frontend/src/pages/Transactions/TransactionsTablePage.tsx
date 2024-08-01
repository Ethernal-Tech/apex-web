import { useState, useRef, ChangeEvent, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, TablePagination, Box, TableSortLabel, SortDirection, Typography } from '@mui/material';
import BasePage from '../base/BasePage';
import { useNavigate } from 'react-router-dom';
import FullPageSpinner from '../../components/spinner/Spinner';
import { BridgeTransactionFilterDto, BridgeTransactionResponseDto } from '../../swagger/apexBridgeApiService';
import Filters from '../../components/filters/Filters';
import { visuallyHidden } from '@mui/utils';
import { headCells } from './tableConfig';
import { getAllFilteredAction } from './action';
import { useTryCatchJsonByAction } from '../../utils/fetchUtils';
import { getStatusIconAndLabel, isStatusFinal } from '../../utils/statusUtils';
import { capitalizeWord, convertDfmToApex, formatAddress, getChainLabelAndColor } from '../../utils/generalUtils';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { fetchAndUpdateBalanceAction } from '../../actions/balance';

const TransactionsTablePage = () => {
	const [transactions, setTransactions] = useState<BridgeTransactionResponseDto | undefined>(undefined);
	const [isLoading, setIsLoading] = useState(false);
	const tableRef = useRef(null);
	const navigate = useNavigate();
  const dispatch = useDispatch();
	const fetchFunction = useTryCatchJsonByAction();
	
  const chain = useSelector((state: RootState) => state.chain.chain)
  const account = useSelector((state: RootState) => state.accountInfo.account);

	const [filters, setFilters] = useState(new BridgeTransactionFilterDto({
    originChain: chain,
    senderAddress: account,
  }));

    const fetchDataCallback = useCallback(
		async (hideLoading: boolean = false) => {
      if (!filters.senderAddress) {
        return;
      }

			!hideLoading && setIsLoading(true);
			const bindedAction = getAllFilteredAction.bind(null, filters);

      const [response] = await Promise.all([
          fetchFunction(bindedAction),
          fetchAndUpdateBalanceAction(dispatch),
      ])

			setTransactions(response);
			!hideLoading && setIsLoading(false);

      return response;
		},
		[filters, fetchFunction, dispatch]
	)

  useEffect(() => {
    setFilters((state) => new BridgeTransactionFilterDto({
        ...state,
        senderAddress: account,
    }))
  }, [account])

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
        if (resp && resp.items.every(x => isStatusFinal(x.status))) {
          clearInterval(handle);
        }
      }, 5000);

      return () => {
        clearInterval(handle);
      }
    },
    [fetchDataCallback]
  )

	const handleChangePage = (
		_: any,
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
      <Box sx={{ width: '100%' }}>
        <Filters
          filters={filters}
          onFilterChange={setFilters}
        />
      </Box>
    <TableContainer component={Paper}  ref={tableRef} sx={{
      background: 'linear-gradient(180deg, #052531 0%, rgba(5, 37, 49, 0.1) 100%)',
      border: '1px solid #435F69',
      borderRadius:'4px'
      }}>
      <Table>
        <TableHead>
          <TableRow>
          {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            padding='normal'
            sortDirection={filters.orderBy === headCell.id ? filters.order as SortDirection : false}
            sx={{ cursor: 'default',color:'white', borderBottom:'1px solid #435F694D' }}
          >
              {
                headCell.id === 'actions' ?
                  headCell.label :
                  <TableSortLabel
                    active={filters.orderBy === headCell.id}
                    direction={filters.orderBy === headCell.id ? filters.order as "desc" | "asc" : 'asc'}
                    onClick={createSortHandler(headCell.id)}
                    sx={{
                      '&:hover':{
                        color:'#a6a6a6',
                        '& .MuiSvgIcon-root':{
                          color:'#a6a6a6'
                        }
                      },
                      '&.Mui-active':{
                        color:'#a6a6a6',
                        '& .MuiSvgIcon-root':{
                          color:'#a6a6a6'
                        }
                      }
                    }}
                  >
                    {headCell.label}
                    {filters.orderBy === headCell.id ? (
                      <Box 
                        component="span" 
                        sx={{
                          ...visuallyHidden,
                          }}>
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
              <TableCell sx={{color:'white', borderBottom:'1px solid #435F694D'}}>
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
              <TableCell sx={{color:'white', borderBottom:'1px solid #435F694D'}}>
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
              <TableCell sx={{color:'white', borderBottom:'1px solid #435F694D'}}>{convertDfmToApex(transaction.amount)} APEX</TableCell>
              <TableCell sx={{color:'white', borderBottom:'1px solid #435F694D'}}>{formatAddress(transaction.receiverAddresses)}</TableCell>
              <TableCell sx={{color:'white', borderBottom:'1px solid #435F694D'}}>{transaction.createdAt.toLocaleString()}</TableCell>
              <TableCell sx={{ textAlign: transaction.finishedAt ? 'left' : 'center', color:'white', borderBottom:'1px solid #435F694D'}}>{transaction.finishedAt?.toLocaleString() || "/"}</TableCell>
              <TableCell sx={{color:'white', borderBottom:'1px solid #435F694D'}}>
                <Box sx={{display:'flex'}}>
                  <Box sx={{marginRight:1}} component='img' src={getStatusIconAndLabel(transaction.status).icon || ''} alt=''/>
                  <Typography sx={{textTransform:'capitalize', display:'inline-block'}}>
                    {getStatusIconAndLabel(transaction.status).label}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell sx={{ borderBottom:'1px solid #435F694D'}}>
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
          sx={{
            color:'white',
            '& .MuiSelect-icon':{
              color:'white',
              '&.Mui-disabled':{
                color:'#435F694D'
              }
            },
            '& .MuiTablePagination-actions .MuiButtonBase-root ':{
              color:'white',
              '&.Mui-disabled':{
                color:'#435F694D'
              }
            }
          }}
    />}
    </BasePage>
  );
};

export default TransactionsTablePage;

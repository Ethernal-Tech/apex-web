import { useState, useRef, ChangeEvent, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, TablePagination, Box, TableSortLabel, SortDirection, Typography } from '@mui/material';
import BasePage from '../base/BasePage';
import { Link } from 'react-router-dom';
import FullPageSpinner from '../../components/spinner/Spinner';
import { BridgeTransactionDto, BridgeTransactionFilterDto, BridgeTransactionResponseDto, ChainEnum } from '../../swagger/apexBridgeApiService';
import Filters from '../../components/filters/Filters';
import { visuallyHidden } from '@mui/utils';
import { headCells } from './tableConfig';
import { getAllFilteredAction } from './action';
import { useTryCatchJsonByAction } from '../../utils/fetchUtils';
import { getStatusIconAndLabel, isStatusFinal } from '../../utils/statusUtils';
import { capitalizeWord, convertDfmToApex, formatAddress, formatTxDetailUrl, getChainLabelAndColor, parseDateString, sortTransactions } from '../../utils/generalUtils';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { fetchAndUpdateBalanceAction } from '../../actions/balance';

const TransactionsTablePage = () => {
	const [transactions, setTransactions] = useState<BridgeTransactionResponseDto | undefined>(undefined);
	const [isLoading, setIsLoading] = useState(false);
	const tableRef = useRef(null);
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

      /* fetching results from fallback db, mapping, and contactenating the items */
      // if connected to vector - ignore try block underneath, no array merging, only use data from first response
      if(chain !== ChainEnum.Vector){
        try {
          
          // const apiUrl = `https://developers.apexfusion.org/api/bridge/transactions?perPage=10000&originChain=${chain}`; // might not need origin chain
          const apiUrl = `https://developers.apexfusion.org/api/bridge/transactions?perPage=1000000`; // applied automatically

          console.log('filters:')
          console.log(filters)
          
          // construct query string for applied filters
          let queryString = Object.entries(filters)

            // TODO nick - remove senderAddress key exclusion once backend fixes senderAddress entering
            .filter(([key, value]) => value !== undefined && key !== 'page' && key !== 'perPage' && key !== 'senderAddress') // pagination from filters disabled for url
            // .filter(([key, value]) => value !== undefined && key !== 'page' && key !== 'perPage') // TODO nick - this should be used once backend senderAddress entering is fixed

            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
          
          const fullApiUrl = apiUrl + '&' + queryString
          console.log(fullApiUrl)

          const res = await fetch(fullApiUrl)
          const fallbackTxs = await res.json();
          
          if(fallbackTxs.BridgeTransactionResponseDto && fallbackTxs.BridgeTransactionResponseDto.items){
            const items = fallbackTxs.BridgeTransactionResponseDto.items
            
            let newItems = items.map((item:any)=>{
              return new BridgeTransactionDto({
                amount: item.amount,
                createdAt: item.createdAt && parseDateString(item.createdAt),
                destinationChain: item.destinationChain,
                destinationTxHash: item.destinationTxHash,
                finishedAt: item.finishedAt && parseDateString(item.finishedAt),
                id: item.id,
                originChain: item.originChain,
                receiverAddresses: item.receiverAddress,
                senderAddress: item.senderAddress,
                sourceTxHash: item.sourceTxHash,
                status: item.status
              })
            })

            let mergedItems = response.items.concat(newItems)
            
            // filtering based on amounts
            mergedItems = mergedItems.filter((item)=> filters.amountFrom ? item.amount >= filters.amountFrom : true)
            mergedItems = mergedItems.filter((item)=> filters.amountTo ? item.amount <= filters.amountTo : true)

            // TODO nick - remove this once our backend corrects entering of senderAddress
            mergedItems = mergedItems.filter((item)=> filters.senderAddress ? item.senderAddress.replaceAll(',','') === filters.senderAddress : true)

            const {order, orderBy} = filters
            if(orderBy && order && (order === 'asc' || order === 'desc')){
              mergedItems = sortTransactions(mergedItems, order, orderBy)
            }

            response.items = mergedItems;
          }
        } catch(e){
          console.error(e)
        }
      }
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
		
	/* const handleChangeRowsPerPage = (
		event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		setFilters(state => new BridgeTransactionFilterDto({
			...state,
			page: 0,
			perPage: parseInt(event.target.value)
		}));
	}; */

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
              <TableCell sx={{color:'white', borderBottom:'1px solid #435F694D'}}>
                {convertDfmToApex(transaction.amount, transaction.originChain)} APEX
              </TableCell>
              
              <TableCell sx={{color:'white', borderBottom:'1px solid #435F694D'}}>
                
                {formatAddress(transaction.receiverAddresses)}
              </TableCell>

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
                
                <Link style={{color:'red', background:'none',textDecoration:'none'}} to={formatTxDetailUrl(transaction)}>
                  View Details
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    {/* {!!transactions?.total &&<TablePagination
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
    />} */}
    </BasePage>
  );
};

export default TransactionsTablePage;

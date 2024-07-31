import React, { useEffect, useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './Home/HomePage';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import TransactionsTablePage from './Transactions/TransactionsTablePage';
import TransactionDetailPage from './Transactions/TransactionDetailPage';
import TestNewTransactionPage from './Transactions/TestNewTransactionPage';

import withMiddleware from '../middleware/withMiddleware';
import { onLoad } from '../actions/login';

export const HOME_ROUTE = '/';
export const TRANSACTIONS_ROUTE = '/transactions';
export const NEW_TRANSACTION_ROUTE = '/new-transaction';
export const TRANSACTION_DETAILS_ROUTE = '/transaction/:id';

const PageRouter: React.FC = () => {

	const walletState = useSelector((state: RootState) => state.wallet);
	const chainState = useSelector((state: RootState) => state.chain);
	const dispatch = useDispatch();
	
	const isLoggedInMemo = !!walletState.wallet;

	useEffect(() => {
		if (isLoggedInMemo) {
			onLoad(walletState.wallet!, chainState.chain, dispatch);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

  const renderHomePage = <HomePage />;

  const renderTransactionsPage = useMemo(
    () => (isLoggedInMemo ? <TransactionsTablePage /> : <Navigate to={HOME_ROUTE} />),
    [isLoggedInMemo]
  );

  const renderNewTransactionPage = useMemo(
    () => (isLoggedInMemo ? <TestNewTransactionPage /> : <Navigate to={HOME_ROUTE} />),
    [isLoggedInMemo]
  );

  const renderTransactionDetailsPage = useMemo(
    () => (isLoggedInMemo ? <TransactionDetailPage /> : <Navigate to={HOME_ROUTE} />),
    [isLoggedInMemo]
  );

  return (
    <Routes>
      <Route path={HOME_ROUTE} element={withMiddleware(() => renderHomePage)({})} />
      <Route path={TRANSACTIONS_ROUTE} element={withMiddleware(() => renderTransactionsPage)({})} />
      <Route path={NEW_TRANSACTION_ROUTE} element={withMiddleware(() => renderNewTransactionPage)({})} />
      <Route path={TRANSACTION_DETAILS_ROUTE} element={withMiddleware(() => renderTransactionDetailsPage)({})} />

      <Route path='*' element={withMiddleware(() => renderHomePage)({})} />
    </Routes>
  );
};

export default PageRouter;

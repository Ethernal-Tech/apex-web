import React, { useEffect, useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import NewTransactionPage from './Transactions/NewTransactionPage';
import PKLoginPage from './Login/PKLoginPage';
import LoginPage from './Login/LoginPage';
import HomePage from './Home/HomePage';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import TransactionsTablePage from './Transactions/TransactionsTablePage';
import TransactionDetailPage from './Transactions/TransactionDetailPage';
import TestNewTransactionPage from './Transactions/TestNewTransactionPage';

import appSettings from '../settings/appSettings';
import withMiddleware from '../middleware/withMiddleware';
import { onLoad } from '../actions/login';

export const LOGIN_ROUTE = '/login';
export const HOME_ROUTE = '/';
export const TRANSACTIONS_ROUTE = '/transactions';
export const NEW_TRANSACTION_ROUTE = '/new-transaction';
export const TRANSACTION_DETAILS_ROUTE = '/transaction/:id';

const PageRouter: React.FC = () => {
  const tokenState = useSelector((state: RootState) => state.token);

	const walletState = useSelector((state: RootState) => state.wallet);
	const dispatch = useDispatch();
	
	const isLoggedInMemo = !!tokenState.token && !!walletState.wallet;

	useEffect(() => {
		if (isLoggedInMemo) {
			onLoad(walletState.wallet!, dispatch);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])


  const renderLoginPage = useMemo(
    () =>
      !isLoggedInMemo ? (
        appSettings.usePrivateKey ? <PKLoginPage /> : <LoginPage />
      ) : (
        <Navigate to={TRANSACTIONS_ROUTE} />
      ),
    [isLoggedInMemo]
  );

  const renderHomePage = <HomePage />;

  const renderTransactionsPage = useMemo(
    () => (isLoggedInMemo ? <TransactionsTablePage /> : <Navigate to={LOGIN_ROUTE} />),
    [isLoggedInMemo]
  );

  const renderNewTransactionPage = useMemo(
    () => (isLoggedInMemo ? <NewTransactionPage /> : <Navigate to={LOGIN_ROUTE} />),
    [isLoggedInMemo]
  );
  
  // TODO - for testing. But users should be lead to TestNewTransactionsPage when making a new tx
  const renderTestNewTransactionsPage = useMemo(
    () => (isLoggedInMemo ? <TestNewTransactionPage /> : <Navigate to={LOGIN_ROUTE} />),
    [isLoggedInMemo]
  );

  const renderTransactionDetailsPage = useMemo(
    () => (isLoggedInMemo ? <TransactionDetailPage /> : <Navigate to={LOGIN_ROUTE} />),
    [isLoggedInMemo]
  );

  return (
    <Routes>
      <Route path={LOGIN_ROUTE} element={withMiddleware(() => renderLoginPage)({})}/>
      <Route path={HOME_ROUTE} element={withMiddleware(() => renderHomePage)({})} />
      <Route path={TRANSACTIONS_ROUTE} element={withMiddleware(() => renderTransactionsPage)({})} />
      <Route path={NEW_TRANSACTION_ROUTE} element={withMiddleware(() => renderNewTransactionPage)({})} />
      <Route path={TRANSACTION_DETAILS_ROUTE} element={withMiddleware(() => renderTransactionDetailsPage)({})} />
      
      {/* todo af - remove this later, and update NEW_TRANSACTION_ROUTE to lead to new page rendered at this route */}
      <Route path={"/test-new-transaction"} element={withMiddleware(() => renderTestNewTransactionsPage)({})} />
    </Routes>
  );
};

export default PageRouter;

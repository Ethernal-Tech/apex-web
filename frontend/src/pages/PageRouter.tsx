import React, { useEffect, useMemo, useRef } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import HomePage from './Home/HomePage';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import TransactionsTablePage from './Transactions/TransactionsTablePage';
import TransactionDetailPage from './Transactions/TransactionDetailPage';
import NewTransactionPage from './Transactions/NewTransactionPage';

import withMiddleware from '../middleware/withMiddleware';
import { onLoad } from '../actions/login';
import { fetchAndUpdateBalanceAction } from '../actions/balance';
import { fetchAndUpdateSettingsAction } from '../actions/settings';
import LandingPage from './Landing/LandingPage';

export const HOME_ROUTE = '/';
export const TRANSACTIONS_ROUTE = '/transactions';
export const NEW_TRANSACTION_ROUTE = '/new-transaction';
export const TRANSACTION_DETAILS_ROUTE = '/transaction/:id';
export const LANDING_ROUTE = '/landing';

const PageRouter: React.FC = () => {
  const location = useLocation();
	const wallet = useSelector((state: RootState) => state.wallet.wallet);
	const chain = useSelector((state: RootState) => state.chain.chain);
	const dispatch = useDispatch();
  const account = useSelector((state: RootState) => state.accountInfo.account);
	const isFullyLoggedIn = !!wallet && !!account;
  const balanceIntervalHandle = useRef<NodeJS.Timer>();
	
	const isLoggedInMemo = !!wallet;

	// useEffect(() => {
	// 	if (isLoggedInMemo) {
	// 		onLoad(wallet, chain, dispatch);
	// 	}
	// // eslint-disable-next-line react-hooks/exhaustive-deps
	// }, [])

	// useEffect(() => {
	// 	fetchAndUpdateSettingsAction(dispatch)
	// // eslint-disable-next-line react-hooks/exhaustive-deps
	// }, [])

  // useEffect(() => {
  //   if (balanceIntervalHandle.current) {
  //     clearInterval(balanceIntervalHandle.current)
  //     balanceIntervalHandle.current = undefined
  //   }

  //   if (!isFullyLoggedIn) {
  //     return
  //   }

  //   fetchAndUpdateBalanceAction(dispatch)

  //   balanceIntervalHandle.current = setInterval(async () => {
  //     await fetchAndUpdateBalanceAction(dispatch)
  //   }, 30000)

  //   return () => {
  //     if (balanceIntervalHandle.current) {
  //       clearInterval(balanceIntervalHandle.current)
  //       balanceIntervalHandle.current = undefined
  //     }
  //   }
  // }, [dispatch, isFullyLoggedIn])

  useEffect(() => {
    if (location.pathname === '/landing') {
      document.body.classList.add('landing-page');
    } else {
      document.body.classList.remove('landing-page');
    }
  }, [location]);

  const renderHomePage = <HomePage />;

  const renderTransactionsPage = useMemo(
    () => (isLoggedInMemo ? <TransactionsTablePage /> : <Navigate to={HOME_ROUTE} />),
    [isLoggedInMemo]
  );

  const renderNewTransactionPage = useMemo(
    () => (isLoggedInMemo ? <NewTransactionPage /> : <Navigate to={HOME_ROUTE} />),
    [isLoggedInMemo]
  );

  const renderTransactionDetailsPage = useMemo(
    () => (isLoggedInMemo ? <TransactionDetailPage /> : <Navigate to={HOME_ROUTE} />),
    [isLoggedInMemo]
  );

  const renderLandingPage = <LandingPage />;

  return (
    <Routes>
        {/* <Route path={HOME_ROUTE} element={withMiddleware(() => renderHomePage)({})} />
        <Route path={TRANSACTIONS_ROUTE} element={withMiddleware(() => renderTransactionsPage)({})} />
        <Route path={NEW_TRANSACTION_ROUTE} element={withMiddleware(() => renderNewTransactionPage)({})} />
        <Route path={TRANSACTION_DETAILS_ROUTE} element={withMiddleware(() => renderTransactionDetailsPage)({})} /> */}
        <Route path={LANDING_ROUTE} element={renderLandingPage} />
        <Route path="*" element={<Navigate to={LANDING_ROUTE} />} />
        {/* <Route path='*' element={withMiddleware(() => renderHomePage)({})} /> */}
    </Routes>
  );
};

export default PageRouter;

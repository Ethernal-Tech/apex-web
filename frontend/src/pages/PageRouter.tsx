import { useEffect, useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import NewTransactionPage from './Transactions/NewTransactionPage';
import PKLoginPage from './Login/PKLoginPage';
import LoginPage from './Login/LoginPage';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import TransactionsTablePage from './Transactions/TransactionsTablePage';
import TransactionDetailPage from './Transactions/TransactionDetailPage';
import appSettings from '../settings/appSettings';
import { onLoad } from '../actions/login';

export const LOGIN_ROUTE = '/login';
export const HOME_ROUTE = '/';
export const NEW_TRANSACTION_ROUTE = '/new-transaction';
export const TRANSACTION_DETAILS_ROUTE = '/transaction/:id';


function PageRouter() {
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
		() => !isLoggedInMemo
			? (appSettings.usePrivateKey ? <PKLoginPage /> : <LoginPage />)
			: <Navigate to={HOME_ROUTE} />,
		[isLoggedInMemo]
	)

	const renderHomePage = useMemo(
		() => isLoggedInMemo ? <TransactionsTablePage /> : <Navigate to={LOGIN_ROUTE} />,
		[isLoggedInMemo]
	)

	const renderNewTransactionPage = useMemo(
		() => isLoggedInMemo ? <NewTransactionPage /> : <Navigate to={LOGIN_ROUTE} />,
		[isLoggedInMemo]
	)

	const renderTransactionDetailsPage = useMemo(
		() => isLoggedInMemo ? <TransactionDetailPage /> : <Navigate to={LOGIN_ROUTE} />,
		[isLoggedInMemo]
	)

	return (
		<Routes >
			<Route path={LOGIN_ROUTE} element={renderLoginPage} />
			<Route path={HOME_ROUTE} element={renderHomePage} />
			<Route path={NEW_TRANSACTION_ROUTE} element={renderNewTransactionPage} />
			<Route path={TRANSACTION_DETAILS_ROUTE} element={renderTransactionDetailsPage} />
		</Routes>
	);
};

export default PageRouter;

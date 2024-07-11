import { useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import NewTransactionPage from './Transactions/NewTransactionPage';
import PKLoginPage from './Login/PKLoginPage';
import LoginPage from './Login/LoginPage';
import HomePage from './Home/HomePage';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import TransactionsTablePage from './Transactions/TransactionsTablePage';
import TransactionDetailPage from './Transactions/TransactionDetailPage';
import appSettings from '../settings/appSettings';
import TestNewTransactionPage from './Transactions/TestNewTransactionPage';

export const LOGIN_ROUTE = '/login';
export const HOME_ROUTE = '/';
export const TRANSACTIONS_ROUTE = '/transactions';
export const NEW_TRANSACTION_ROUTE = '/new-transaction';
export const TRANSACTION_DETAILS_ROUTE = '/transaction/:id';


function PageRouter() {
	const tokenState = useSelector((state: RootState) => state.token);
	
	const isLoggedInMemo = useMemo(
		() => {
			return tokenState.token;
		},
		[tokenState]
	)

	const renderLoginPage = useMemo(
		() => !isLoggedInMemo
			? (appSettings.usePrivateKey ? <PKLoginPage /> : <LoginPage />)
			: <Navigate to={TRANSACTIONS_ROUTE} />,
		[isLoggedInMemo]
	)

	// TODO af - implement this to use the home page. Also the nav should be sorted out to support this
	const renderHomePage = <HomePage />;

	const renderTransactionsPage = useMemo(
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
			<Route path={TRANSACTIONS_ROUTE} element={renderTransactionsPage} />
			<Route path={NEW_TRANSACTION_ROUTE} element={renderNewTransactionPage} />
			<Route path={TRANSACTION_DETAILS_ROUTE} element={renderTransactionDetailsPage} />
			
			{/* todo af - remote this later, just for testing purposes */}
			<Route path={"/test-new-transaction"} element={<TestNewTransactionPage/>} />
			
		</Routes>
	);
};

export default PageRouter;

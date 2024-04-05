import { useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './Home/HomePage';
import LoginPage from './Login/LoginPage';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import CryptoBridgeTransactionsTable from './table/CryptoBridgeTransactionsTable';
import TransactionDetailPage from './transatsion-details/TransactionDetailPage';

export const LOGIN_ROUTE = '/login';
export const TABLE_ROUTE = '/table';
export const BRIDGE_ROUTE = '/bridge';
export const TRANSACTION_DETAILS_ROUTE = '/transaction/:id';


function PageRouter() {
	const isLoggedIn = useSelector((state: RootState) => state.isLoggedIn.isLoggedIn);
	
	const isLoggedInMemo = useMemo(
		() => {
			// TODO: handle isLoggedIn correctly, and remove this redux state
			return isLoggedIn;
		},
		[isLoggedIn]
	)

	const renderHomePage = useMemo(
		() => isLoggedInMemo ? <CryptoBridgeTransactionsTable /> : <Navigate to={LOGIN_ROUTE} />,
		[isLoggedInMemo]
	)

	const renderLoginPage = useMemo(
		() => !isLoggedInMemo ? <LoginPage /> : <Navigate to={TABLE_ROUTE} />,
		[isLoggedInMemo]
	)

	const renderBridgePage = useMemo(
		() => isLoggedInMemo ? <HomePage /> : <Navigate to={LOGIN_ROUTE} />,
		[isLoggedInMemo]
	)

	const renderTransactionDetailsPage = useMemo(
		() => isLoggedInMemo ? <TransactionDetailPage /> : <Navigate to={LOGIN_ROUTE} />,
		[isLoggedInMemo]
	)

	return (
		<Routes >
			<Route path={LOGIN_ROUTE} element={renderLoginPage} />
			<Route path={BRIDGE_ROUTE} element={renderBridgePage} />
			<Route path={TABLE_ROUTE} element={renderHomePage} />
			<Route path={TRANSACTION_DETAILS_ROUTE} element={renderTransactionDetailsPage} />
		</Routes>
	);
};

export default PageRouter;

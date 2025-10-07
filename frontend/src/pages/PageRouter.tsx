import React, { useEffect, useMemo, useRef } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './Home/HomePage';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import TransactionsTablePage from './Transactions/TransactionsTablePage';
import TransactionDetailPage from './Transactions/TransactionDetailPage';
import NewTransactionPage from './Transactions/NewTransactionPage';

import withMiddleware from '../middleware/withMiddleware';
import { onLoad } from '../actions/login';
import {
	fetchAndUpdateBalanceAction,
	getUpdateBalanceInterval,
} from '../actions/balance';
import { fetchAndUpdateSettingsAction } from '../actions/settings';
import TermsOfServicePage from './TermsOfServicePage/TermsOfServicePage';
import PrivacyPolicyPage from './PrivacyPolicyPage/PrivacyPolicyPage';

export const HOME_ROUTE = '/';
export const TRANSACTIONS_ROUTE = '/transactions';
export const NEW_TRANSACTION_ROUTE = '/new-transaction';
export const TRANSACTION_DETAILS_ROUTE = '/transaction/:id';
export const PRIVACY_POLICY_ROUTE = '/privacy-policy';
export const TERMS_OF_SERVICE_ROUTE = '/terms-of-service';

const PageRouter: React.FC = () => {
	const settings = useSelector((state: RootState) => state.settings);
	const wallet = useSelector((state: RootState) => state.wallet.wallet);
	const chain = useSelector((state: RootState) => state.chain.chain);
	const dispatch = useDispatch();
	const account = useSelector(
		(state: RootState) => state.accountInfo.account,
	);
	const isFullyLoggedIn = !!wallet && !!account;
	const balanceIntervalHandle = useRef<NodeJS.Timer>();

	const isLoggedInMemo = !!wallet;

	useEffect(() => {
		if (
			isLoggedInMemo &&
			Object.keys(settings.allowedDirections).length > 0
		) {
			onLoad(wallet, chain, settings, dispatch);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [settings]);

	useEffect(() => {
		fetchAndUpdateSettingsAction(dispatch);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (balanceIntervalHandle.current) {
			clearInterval(balanceIntervalHandle.current);
			balanceIntervalHandle.current = undefined;
		}

		if (!isFullyLoggedIn) {
			return;
		}

		fetchAndUpdateBalanceAction(dispatch);

		balanceIntervalHandle.current = setInterval(async () => {
			await fetchAndUpdateBalanceAction(dispatch);
		}, getUpdateBalanceInterval());

		return () => {
			if (balanceIntervalHandle.current) {
				clearInterval(balanceIntervalHandle.current);
				balanceIntervalHandle.current = undefined;
			}
		};
	}, [dispatch, isFullyLoggedIn]);

	const renderHomePage = <HomePage />;

	const renderTransactionsPage = useMemo(
		() =>
			isLoggedInMemo ? (
				<TransactionsTablePage />
			) : (
				<Navigate to={HOME_ROUTE} />
			),
		[isLoggedInMemo],
	);

	const renderNewTransactionPage = useMemo(
		() =>
			isLoggedInMemo ? (
				<NewTransactionPage />
			) : (
				<Navigate to={HOME_ROUTE} />
			),
		[isLoggedInMemo],
	);

	const renderTransactionDetailsPage = useMemo(
		() =>
			isLoggedInMemo ? (
				<TransactionDetailPage />
			) : (
				<Navigate to={HOME_ROUTE} />
			),
		[isLoggedInMemo],
	);

	return (
		<Routes>
			<Route
				path={HOME_ROUTE}
				element={withMiddleware(() => renderHomePage)({})}
			/>
			<Route
				path={TRANSACTIONS_ROUTE}
				element={withMiddleware(() => renderTransactionsPage)({})}
			/>
			<Route
				path={NEW_TRANSACTION_ROUTE}
				element={withMiddleware(() => renderNewTransactionPage)({})}
			/>
			<Route
				path={TRANSACTION_DETAILS_ROUTE}
				element={withMiddleware(() => renderTransactionDetailsPage)({})}
			/>
			<Route
				path={TERMS_OF_SERVICE_ROUTE}
				element={withMiddleware(() => <TermsOfServicePage />)({})}
			/>
			<Route
				path={PRIVACY_POLICY_ROUTE}
				element={withMiddleware(() => <PrivacyPolicyPage />)({})}
			/>
			<Route
				path="*"
				element={withMiddleware(() => renderHomePage)({})}
			/>
		</Routes>
	);
};

export default PageRouter;

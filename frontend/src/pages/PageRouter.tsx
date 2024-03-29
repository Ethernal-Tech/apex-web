import { useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './Home/HomePage';
import LoginPage from './Login/LoginPage';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';

export const HOME_ROUTE = '/';
export const LOGIN_ROUTE = '/login'


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
		() => isLoggedInMemo ? <HomePage /> : <Navigate to={LOGIN_ROUTE} />,
		[isLoggedInMemo]
	)

	const renderLoginPage = useMemo(
		() => !isLoggedInMemo ? <LoginPage /> : <Navigate to={HOME_ROUTE} />,
		[isLoggedInMemo]
	)

	return (
		<Routes >
			<Route path={LOGIN_ROUTE} element={renderLoginPage} />
			<Route path={HOME_ROUTE} element={renderHomePage} />
		</Routes>
	);
};

export default PageRouter;

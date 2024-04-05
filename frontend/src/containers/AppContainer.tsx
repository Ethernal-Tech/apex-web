import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import PageRouter from '../pages/PageRouter';
import { store } from '../redux/store';
import { CssBaseline } from '@mui/material';

const AppContainer = () => {
	return (
		<Provider store={store}>
			<CssBaseline />
			<BrowserRouter>
				<PageRouter />
			</BrowserRouter>
		</Provider>
	)
}

export default AppContainer;

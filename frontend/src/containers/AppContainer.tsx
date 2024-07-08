import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import PageRouter from '../pages/PageRouter';
import { store } from '../redux/store';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';


const AppContainer = () => {
	return (
		<Provider store={store}>
			<ThemeProvider theme={theme}>
				<CssBaseline />
				<BrowserRouter>
					<PageRouter />
				</BrowserRouter>
			</ThemeProvider>
		</Provider>
	)
}

export default AppContainer;

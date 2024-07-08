import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import PageRouter from '../pages/PageRouter';
import { store } from '../redux/store';
import { CssBaseline } from '@mui/material';
import { hexToRgb, ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';


// defined colors used in theme
export const menuDark = '#051D26';;
export const white = "#ffffff";
export const menuOverlay = `rgba(${hexToRgb(menuDark)},0.6)`;

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

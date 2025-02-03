import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import PageRouter from '../pages/PageRouter';
import { store } from '../redux/store';
import { CssBaseline, ThemeProvider } from '@mui/material';
import appSettings from '../settings/appSettings';
import { skylineTheme, theme } from './theme';
import { useEffect } from 'react';


const AppContainer = () => {
	
	useEffect(() => {
		document.title = appSettings.isSkyline ? "Skyline Bridge | Ethernal" : "Reactor Bridge | Apex Fusion";
		const favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
		if (favicon) {
			favicon.href = appSettings.isSkyline ? "/favicon-skyline.ico" : "/favicon.ico";
		}
	}, []);

	return (
		<Provider store={store}>
			<ThemeProvider theme={appSettings.isSkyline ? skylineTheme : theme}>
				<CssBaseline />
				<BrowserRouter>
					<PageRouter />
				</BrowserRouter>
			</ThemeProvider>
		</Provider>
	)
}

export default AppContainer;

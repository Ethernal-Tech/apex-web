import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import PageRouter from '../pages/PageRouter';
import { store } from '../redux/store';


const AppContainer = () => {
	return (
		<Provider store={store}>
			<BrowserRouter>
				<PageRouter />
			</BrowserRouter>
		</Provider>
	)
}

export default AppContainer;

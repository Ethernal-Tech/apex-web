import CssBaseline from '@mui/material/CssBaseline';
import { AppBar, Toolbar, Typography } from '@mui/material';
import PrivateKeyForm from "./containers/PrivateKeyForm";

function Bridge() {
	return (
		<div className="App">
			<AppBar position='fixed'>
				<Toolbar>
					<Typography fontSize={'large'} fontWeight={'bold'}>
						Apex MVP Bridge
					</Typography>
				</Toolbar>
			</AppBar>
			<Toolbar />
			<PrivateKeyForm />
		</div>
	);
}

export default Bridge;

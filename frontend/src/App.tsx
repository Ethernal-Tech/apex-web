import React from 'react';
import './App.css';
import CssBaseline from '@mui/material/CssBaseline';
import { AppBar, Toolbar, Typography } from '@mui/material';
import PrivateKeyForm from "./containers/PrivateKeyForm";

function App() {
	return (
		<>
			<CssBaseline />
			<div className="App">
				<AppBar position='fixed'>
					<Toolbar>
						<Typography fontSize={'large'} fontWeight={'bold'}>
							Apex MVP Bridge
						</Typography>
					</Toolbar>
				</AppBar>
				<Toolbar />
				<PrivateKeyForm/>
			</div>
		</>
	);
}

export default App;

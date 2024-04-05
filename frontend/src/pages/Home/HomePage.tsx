import { AppBar, Button, Toolbar, Typography } from '@mui/material';
import PrivateKeyForm from '../../containers/deprecated/PrivateKeyForm';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { removeTokenAction } from '../../redux/slices/tokenSlice';

function HomePage() {
	const dispatch = useDispatch();

	const logoutCallback = useCallback(
		() => {
			dispatch(removeTokenAction());
		},
		[dispatch]
	)
	
	return (
		<div className="App">
			<AppBar position='fixed'>
				<Toolbar sx={{ display: 'flex', flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginLeft: '10px' }}>
					<Typography fontSize={'large'} fontWeight={'bold'}>
						Apex MVP Bridge
					</Typography>
					<Button sx={{ width: '150px', fontSize: 'large' }} variant="contained" onClick={logoutCallback}>
						Logout
					</Button>
				</Toolbar>
			</AppBar>
			<Toolbar />
			<PrivateKeyForm />
		</div>
	)
}

export default HomePage;
import {
	AppBar,
	Box,
	Button,
	CircularProgress,
	lighten,
	ListItemIcon,
	ListItemText,
	Menu,
	MenuItem,
	styled,
	Toolbar,
} from '@mui/material';
import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
	TRANSACTIONS_ROUTE,
	NEW_TRANSACTION_ROUTE,
	HOME_ROUTE,
} from '../../pages/PageRouter';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LogoutIcon from '@mui/icons-material/Logout';
import { ReactComponent as ApexFusionLogo } from '../../assets/apex-fusion-logo.svg';
import { white } from '../../containers/theme';
import ButtonCustom from '../Buttons/ButtonCustom';
import { RootState } from '../../redux/store';
import { formatAddress } from '../../utils/generalUtils';
import { logout } from '../../actions/logout';

const CustomMenu = styled(Menu)({
	'.MuiPaper-root': {
		backgroundColor: '#424543',
		border: '1px solid #435F69',
	},

	'& .MuiMenu-list': {
		paddingTop: '0',
		paddingBottom: '0',
	},

	'& .MuiTypography-root': {
		fontSize: '14px',
	},

	// @todo check this
	/* '& .MuiSvgIcon-root': {
		marginRight: '0px',
	}, */
});

const CustomMenuItem = styled(MenuItem)({
	paddingTop: '10px',
	paddingBottom: '10px',
	backgroundColor: '#424543',
	'&:hover': {
		backgroundColor: lighten('#424543', 0.1),
	},
	color: '#ffffff',
});

const AppBarComponent = () => {
	const wallet = useSelector((state: RootState) => state.wallet.wallet);
	const account = useSelector(
		(state: RootState) => state.accountInfo.account,
	);
	const loginConnecting = useSelector(
		(state: RootState) => state.login.connecting,
	);
	const isLoggedInMemo = !!wallet && !!account;

	const navigate = useNavigate();
	const location = useLocation();
	const dispatch = useDispatch();
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const open = Boolean(anchorEl);
	const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		setAnchorEl(event.currentTarget);
	};
	const handleClose = () => {
		setAnchorEl(null);
	};

	const logoutCallback = useCallback(() => {
		logout(dispatch);
	}, [dispatch]);
	function handleOptionClick(to: string) {
		handleClose();
		navigate(to, { replace: true });
	}

	function isActiveNavLink(route: string) {
		return route === location.pathname;
	}

	return (
		<>
			<AppBar
				position="fixed"
				sx={{
					zIndex: 20,
					boxShadow: 'none',
					background: 'transparent',
				}}
			>
				<Toolbar
					sx={{
						display: 'flex',
						flex: 1,
						flexDirection: 'row',
						justifyContent: 'space-between',
						marginLeft: '10px',
						background: `linear-gradient(180deg, rgba(0,0,0,0.1) 60%, transparent 100%)`,
					}}
				>
					<Box sx={{ flex: 1 }}>
						<Button onClick={() => handleOptionClick(HOME_ROUTE)}>
							<ApexFusionLogo />
						</Button>
					</Box>

					<Box
						sx={{
							flex: 1,
							display: 'flex',
							justifyContent: 'center',
						}}
					>
						{isLoggedInMemo && (
							<>
								<ButtonCustom
									variant={
										isActiveNavLink(NEW_TRANSACTION_ROUTE)
											? 'navigationActive'
											: 'navigation'
									}
									onClick={() =>
										handleOptionClick(NEW_TRANSACTION_ROUTE)
									}
								>
									Transfer
								</ButtonCustom>
								<ButtonCustom
									variant={
										isActiveNavLink(TRANSACTIONS_ROUTE)
											? 'navigationActive'
											: 'navigation'
									}
									onClick={() =>
										handleOptionClick(TRANSACTIONS_ROUTE)
									}
								>
									Bridging History
								</ButtonCustom>
							</>
						)}
					</Box>
					<Box
						sx={{
							flex: 1,
							display: 'flex',
							justifyContent: 'flex-end',
						}}
					>
						{loginConnecting ? (
							<Button
								sx={{
									border: '1px solid',
									borderColor: '#435F69',
									px: '24px',
									py: '10px',
									borderRadius: '8px',
									color: white,
									textTransform: 'lowercase',
								}}
							>
								<CircularProgress
									sx={{ marginLeft: 1 }}
									size={20}
								/>
							</Button>
						) : isLoggedInMemo ? (
							<Button
								id="basic-button"
								aria-controls={open ? 'basic-menu' : undefined}
								aria-haspopup="true"
								aria-expanded={open ? 'true' : undefined}
								onClick={handleClick}
								sx={{
									border: '1px solid',
									borderColor: '#424543',
									px: '24px',
									py: '10px',
									borderRadius: '100px',
									color: white,
									textTransform: 'lowercase',
								}}
								endIcon={<ExpandMoreIcon />}
							>
								{formatAddress(account)}
							</Button>
						) : null}
					</Box>
					<CustomMenu
						id="basic-menu"
						anchorEl={anchorEl}
						open={open}
						onClose={handleClose}
						MenuListProps={{
							'aria-labelledby': 'basic-button',
						}}
					>
						<CustomMenuItem onClick={logoutCallback}>
							<ListItemIcon>
								<LogoutIcon
									fontSize="small"
									sx={{ color: 'white' }}
								/>
							</ListItemIcon>
							<ListItemText>Disconnect Wallet</ListItemText>
						</CustomMenuItem>
					</CustomMenu>
				</Toolbar>
			</AppBar>
			<Toolbar />
		</>
	);
};

export default AppBarComponent;

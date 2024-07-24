import { AppBar, Button, ListItemIcon, ListItemText, Menu, MenuItem, Toolbar } from "@mui/material"
import { useCallback, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { TRANSACTIONS_ROUTE, NEW_TRANSACTION_ROUTE, HOME_ROUTE, LOGIN_ROUTE } from "../../pages/PageRouter";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LogoutIcon from '@mui/icons-material/Logout';
import ApexFusionLogo from "../../assets/apex-fusion-logo.svg";
import { menuDark, white } from "../../containers/theme";
import ButtonCustom from "../Buttons/ButtonCustom";
import { RootState } from "../../redux/store";
import { formatAddress } from "../../utils/generalUtils";
import { logout } from "../../actions/logout";

const AppBarComponent = () => {
    const walletState = useSelector((state: RootState) => state.wallet);
    const isLoggedInMemo = !!walletState.wallet;
    
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    const logoutCallback = useCallback(
		() => {
            logout(dispatch);
		},
		[dispatch],
	)
    function handleOptionClick(to: string) {
        handleClose();
        navigate(to, { replace: true });
    }

    // const test = useCallback(async () => {
    //     const wallet = walletHandler.getEnabledWallet();
    //     if (!wallet) {
    //         return
    //     }

    //     // native cardano api
    //     const nativeAPI = walletHandler.getNativeAPI()
    //     console.log('nativeAPI', nativeAPI)
    // }, [])
    return (
        <>
            <AppBar position='fixed' sx={{ zIndex: 20, boxShadow:'none', background: menuDark }}>
                <Toolbar sx={{ display: 'flex', flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginLeft: '10px' }}>
                    <Button
                        onClick={() => handleOptionClick(HOME_ROUTE)}
                    >
                        {/* Logo svg */}
                        <img src={ApexFusionLogo} alt='apex fusion logo'/>
                    </Button>

                    <div>
                        <ButtonCustom 
                            variant="navigation"
                            onClick={() => handleOptionClick(NEW_TRANSACTION_ROUTE)}
                        >
                           Transfer
                        </ButtonCustom>
                        <ButtonCustom
                            variant="navigation"
                            onClick={() => handleOptionClick(TRANSACTIONS_ROUTE)}
                        >
                            Bridging History
                        </ButtonCustom>
                        
                        {isLoggedInMemo ? (
                        <Button
                            id="basic-button"
                            aria-controls={open ? 'basic-menu' : undefined}
                            aria-haspopup="true"
                            aria-expanded={open ? 'true' : undefined}
                            onClick={handleClick}
                            sx={{ border: '1px solid', borderColor:'#435F69', px: '24px', py: '10px', borderRadius:'8px', color: white, textTransform:'lowercase'}}
                            endIcon={<ExpandMoreIcon />}>
                                {formatAddress(walletState.accountInfo?.account)}
                        </Button>
                        ) : (
                        <ButtonCustom 
                            variant="redNavigation"
                            onClick={() => handleOptionClick(LOGIN_ROUTE)}
                        >
                            Connect Wallet
                        </ButtonCustom>
                        )}
                    </div>
                    <Menu
                        id="basic-menu"
                        anchorEl={anchorEl}
                        open={open}
                        onClose={handleClose}
                        MenuListProps={{
                            'aria-labelledby': 'basic-button',
                        }}
                    >
                        <MenuItem onClick={logoutCallback}>
                            <ListItemIcon>
                                <LogoutIcon fontSize="small" />
                            </ListItemIcon>
                        <ListItemText>Disconnect Wallet</ListItemText>
                        </MenuItem>
                    </Menu>
                </Toolbar>
            </AppBar>
            <Toolbar />
        </>
    )
}

export default AppBarComponent;

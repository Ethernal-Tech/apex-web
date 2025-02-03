import { AppBar, Button, CircularProgress, ListItemIcon, ListItemText, Menu, MenuItem, styled, Toolbar } from "@mui/material"
import { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { TRANSACTIONS_ROUTE, NEW_TRANSACTION_ROUTE, HOME_ROUTE } from "../../pages/PageRouter";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LogoutIcon from '@mui/icons-material/Logout';
import ApexFusionLogo from "../../assets/apex-fusion-logo.svg";
import SkylineLogo from "../../assets/skyline/skyline-logo.svg";
import { menuDark, white } from "../../containers/theme";
import ButtonCustom from "../Buttons/ButtonCustom";
import { RootState } from "../../redux/store";
import { formatAddress } from "../../utils/generalUtils";
import { logout } from "../../actions/logout";
import appSettings from "../../settings/appSettings";

const CustomMenu = styled(Menu)({
    // backgroundColor: 'rgba(0,0,0, 0.4)',
    '.MuiPaper-root':{
        backgroundColor: '#051D26',
        border:'1px solid #435F69'
    },
})

const CustomMenuItem = styled(MenuItem)({
    backgroundColor: '#051D26',
    '&:hover': {
      backgroundColor: '#073B4C',
    },
    color: '#ffffff',
  });

const AppBarComponent = () => {
    const wallet = useSelector((state: RootState) => state.wallet.wallet);
    const account = useSelector((state: RootState) => state.accountInfo.account);
    const loginConnecting = useSelector((state: RootState) => state.login.connecting);
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

    function isActiveNavLink(route:string){
        return route === location.pathname;
    }

    return (
        <>
            <AppBar position='fixed' sx={{ zIndex: 20, boxShadow:'none', background: menuDark }}>
                <Toolbar sx={{ display: 'flex', flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginLeft: '10px' }}>
                    <Button
                        onClick={() => handleOptionClick(HOME_ROUTE)}
                    >
                        {/* Logo svg */}
                        <img src={appSettings.isSkyline ? SkylineLogo : ApexFusionLogo} alt='logo' height='40px' />
                    </Button>

                    <div>
                        {
                            isLoggedInMemo &&
                            <>
                                <ButtonCustom 
                                    variant={isActiveNavLink(NEW_TRANSACTION_ROUTE) ? "navigationActive" : "navigation"}
                                    sx={appSettings.isSkyline && isActiveNavLink(NEW_TRANSACTION_ROUTE) ? { color: "#1ea29d" } : {}}
                                    onClick={() => handleOptionClick(NEW_TRANSACTION_ROUTE)}
                                >
                                Transfer
                                </ButtonCustom>
                                <ButtonCustom
                                    variant={isActiveNavLink(TRANSACTIONS_ROUTE) ? "navigationActive" : "navigation"}
                                    sx={appSettings.isSkyline && isActiveNavLink(NEW_TRANSACTION_ROUTE) ? { color: "#1ea29d" } : {}}
                                    onClick={() => handleOptionClick(TRANSACTIONS_ROUTE)}
                                >
                                    Bridging History
                                </ButtonCustom>
                            </>
                        }

                        {
                            loginConnecting ? (
                                <Button sx={{ border: '1px solid', borderColor:'#435F69', px: '24px', py: '10px', borderRadius:'8px', color: white, textTransform:'lowercase'}}>
                                    <CircularProgress sx={{ marginLeft: 1 }} size={20}/>
                                </Button>
                            ) : (
                                isLoggedInMemo ? (
                                    <Button 
                                        id="basic-button"
                                        aria-controls={open ? 'basic-menu' : undefined}
                                        aria-haspopup="true"
                                        aria-expanded={open ? 'true' : undefined}
                                        onClick={handleClick}
                                        sx={{ border: '1px solid', borderColor:'#435F69', px: '24px', py: '10px', borderRadius:'8px', color: white, textTransform:'lowercase'}}
                                        endIcon={<ExpandMoreIcon />}>
                                            {formatAddress(account)}
                                    </Button>
                                ) : null
                            )
                        }
                        
                        
                    </div>
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
                                <LogoutIcon fontSize="small" sx={{color:'white'}}/>
                            </ListItemIcon>
                            <ListItemText>Disconnect Wallet</ListItemText>
                        </CustomMenuItem>
                    </CustomMenu>
                </Toolbar>
            </AppBar>
            <Toolbar />
        </>
    )
}

export default AppBarComponent;

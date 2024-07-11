import { AppBar, Button, Divider, ListItemIcon, ListItemText, Menu, MenuItem, Toolbar, Typography } from "@mui/material"
import { useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { TRANSACTIONS_ROUTE, NEW_TRANSACTION_ROUTE, HOME_ROUTE, LOGIN_ROUTE } from "../../pages/PageRouter";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FiberNewIcon from '@mui/icons-material/FiberNew';
import TableChartIcon from '@mui/icons-material/TableChart';
import LogoutIcon from '@mui/icons-material/Logout';
import { removeTokenAction } from "../../redux/slices/tokenSlice";
import { removePKLoginAction } from "../../redux/slices/pkLoginSlice";
import ApexFusionLogo from "../../assets/apex-fusion-logo.svg";
import { menuDark, white } from "../../containers/theme";

const AppBarComponent = () => {
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
            dispatch(removePKLoginAction());
			dispatch(removeTokenAction());
		},
		[dispatch]
	)
    function handleOptionClick(to: string) {
        handleClose();
        navigate(to, { replace: true });
    }
    return (
        <>
            {/* todo af - update to not use hex value for bgColor */}
            <AppBar position='fixed' sx={{ zIndex: 20, boxShadow:'none', background: menuDark }}>
                <Toolbar sx={{ display: 'flex', flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginLeft: '10px' }}>
                    <Button
                        onClick={() => handleOptionClick(HOME_ROUTE)}
                    >
                        {/* Logo svg */}
                        <img src={ApexFusionLogo} alt='apex fusion logo'/>
                    </Button>

                    <div>
                        <Button
                            onClick={() => handleOptionClick(NEW_TRANSACTION_ROUTE)}
                            // TODO af - change the border color to not use hex value. Also update this on a theme level
                            sx={{ px: '24px', py: '10px', borderRadius:'8px', color: white, textTransform:'capitalize' }}>
                                Transfer
                        </Button>
                        <Button
                            onClick={() => handleOptionClick(TRANSACTIONS_ROUTE)}
                            // TODO af - change the border color to not use hex value. Also update this on a theme level
                            sx={{ px: '24px', py: '10px', borderRadius:'8px', color: white, textTransform:'capitalize' }}>
                                Bridging History
                        </Button>
                        
                        {/* TODO af - display button when user is logged in, otherwise display btn underneath */}
                        <Button
                            id="basic-button"
                            aria-controls={open ? 'basic-menu' : undefined}
                            aria-haspopup="true"
                            aria-expanded={open ? 'true' : undefined}
                            onClick={handleClick}
                            
                            // TODO af - change the border color to not use hex value. Also update this on a theme level
                            sx={{ border: '1px solid', borderColor:'#435F69', px: '24px', py: '10px', borderRadius:'8px', color: white, textTransform:'lowercase'}}
                            endIcon={<ExpandMoreIcon />}>
                                addr_test1...lt9cc
                        </Button>
                        
                        {/* TODO af - display button when user is NOT logged in, otherwise display button above */}
                        <Button
                            onClick={() => handleOptionClick(LOGIN_ROUTE)}
                            sx={{ border: '1px solid', borderColor:'#F25041', px: '24px', py: '10px', borderRadius:'8px', color: white, textTransform:'capitalize' }}>
                                Connect Wallet
                        </Button>
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

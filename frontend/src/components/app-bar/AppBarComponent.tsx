import { AppBar, Button, Divider, ListItemIcon, ListItemText, Menu, MenuItem, Toolbar, Typography } from "@mui/material"
import { useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { HOME_ROUTE, NEW_TRANSACTION_ROUTE } from "../../pages/PageRouter";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FiberNewIcon from '@mui/icons-material/FiberNew';
import TableChartIcon from '@mui/icons-material/TableChart';
import LogoutIcon from '@mui/icons-material/Logout';
import { removeTokenAction } from "../../redux/slices/tokenSlice";
import { removePKLoginAction } from "../../redux/slices/pkLoginSlice";

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
            <AppBar position='fixed' sx={{ zIndex: 20 }}>
                <Toolbar sx={{ display: 'flex', flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginLeft: '10px' }}>
                    <Typography fontSize={'large'} fontWeight={'bold'}>
                        Apex MVP Bridge
                    </Typography>
                    <Button
                        id="basic-button"
                        aria-controls={open ? 'basic-menu' : undefined}
                        aria-haspopup="true"
                        aria-expanded={open ? 'true' : undefined}
                        onClick={handleClick}
                        // TODO af - change the border color to not use hex value. Also update this on a theme level
                        sx={{ border: '1px solid', borderColor:'#435F69', px: '24px', py: '10px', borderRadius:'8px' }}
                        endIcon={<ExpandMoreIcon />}
                    >
                        addr_test1...lt9cc
                    </Button>
                    <Menu
                        id="basic-menu"
                        anchorEl={anchorEl}
                        open={open}
                        onClose={handleClose}
                        MenuListProps={{
                            'aria-labelledby': 'basic-button',
                        }}
                    >
                        <MenuItem onClick={() => handleOptionClick(NEW_TRANSACTION_ROUTE)}>
                            <ListItemIcon>
                                <FiberNewIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>New Transaction</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => handleOptionClick(HOME_ROUTE)}>
                            <ListItemIcon>
                                <TableChartIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Transactions</ListItemText>
                        </MenuItem>
                        <Divider />
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

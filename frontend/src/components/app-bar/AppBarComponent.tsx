import { AppBar, Box, Button, Divider, ListItemIcon, ListItemText, Menu, MenuItem, Toolbar, Typography } from "@mui/material"
import { useCallback, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setIsLoggedInSliceAction } from "../../redux/slices/isLoggedInSlice";
import { TABLE_ROUTE, BRIDGE_ROUTE } from "../../pages/PageRouter";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FiberNewIcon from '@mui/icons-material/FiberNew';
import TableChartIcon from '@mui/icons-material/TableChart';
import LogoutIcon from '@mui/icons-material/Logout';

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
            dispatch(setIsLoggedInSliceAction(false));
        },
        [dispatch]
    )
    function handleOptionClick(to: string) {
        handleClose();
        navigate(to, { replace: true });
    }
    return (
        <>
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
                        sx={{ color: 'white' }}
                        endIcon={<ExpandMoreIcon />}
                    >
                        Menu
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
                        <MenuItem onClick={() => handleOptionClick(BRIDGE_ROUTE)}>
                            <ListItemIcon>
                                <FiberNewIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>New Transaction</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => handleOptionClick(TABLE_ROUTE)}>
                            <ListItemIcon>
                                <TableChartIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Transactions Table</ListItemText>
                        </MenuItem>
                        <Divider />
                        <MenuItem onClick={logoutCallback}>
                        <ListItemIcon>
                                <LogoutIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Logout</ListItemText>
                        </MenuItem>
                    </Menu>
                </Toolbar>
            </AppBar>
            <Toolbar />
        </>
    )
}

export default AppBarComponent;

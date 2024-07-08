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
                    {/* <Typography fontSize={'large'} fontWeight={'bold'}>
                        Apex MVP Bridge
                    </Typography> */}
                    <Button
                        // component='a'
                        // href='/'
                        onClick={() => handleOptionClick(HOME_ROUTE)}
                    >
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M39.9285 19.5473C39.8083 19.1912 39.5517 18.8973 39.2149 18.7303C38.8782 18.5634 38.4889 18.5369 38.1327 18.6569L21.4162 24.2919V14.8203L29.7336 12.0448L29.7675 12.0323C29.7952 12.0222 29.8215 12.0122 29.8466 12.0009L29.9032 11.9745C29.926 11.9645 29.9482 11.9531 29.9697 11.9406L30.0325 11.9042L30.0853 11.869L30.1543 11.8188L30.1958 11.7861C30.2196 11.766 30.2422 11.7447 30.2648 11.7233L30.2874 11.7033L30.2987 11.6894C30.3201 11.6681 30.3402 11.6455 30.3603 11.6229L30.3954 11.5814C30.4118 11.5613 30.4256 11.54 30.4407 11.5199C30.4557 11.4998 30.467 11.4835 30.4783 11.4646C30.4896 11.4458 30.4997 11.4295 30.5097 11.4119C30.5198 11.3943 30.5361 11.3667 30.5487 11.3428L30.5713 11.2951C30.5826 11.27 30.5939 11.2449 30.6039 11.2185C30.614 11.1921 30.6165 11.1821 30.6228 11.1645C30.629 11.1469 30.6403 11.1155 30.6479 11.0917C30.6554 11.0678 30.6592 11.0452 30.6642 11.0226C30.6692 11 30.6742 10.9811 30.678 10.9611C30.6818 10.941 30.6868 10.9046 30.6906 10.8769C30.6943 10.8493 30.6906 10.8443 30.6906 10.8279C30.6906 10.8116 30.6906 10.7677 30.6906 10.7375C30.6906 10.7074 30.6906 10.7061 30.6906 10.6911C30.6906 10.676 30.6906 10.6346 30.6906 10.6069C30.6906 10.5793 30.6906 10.5692 30.6906 10.5516C30.6906 10.534 30.6906 10.5039 30.6805 10.4813C30.6705 10.4587 30.673 10.4336 30.668 10.4097C30.6629 10.3859 30.6592 10.3721 30.6554 10.3532C30.6516 10.3344 30.6403 10.2967 30.6315 10.2691C30.631 10.2632 30.631 10.2574 30.6315 10.2515L30.619 10.2213C30.6089 10.1925 30.5989 10.1649 30.5863 10.136L30.5637 10.087L30.5261 10.0129L30.4921 9.95638L30.4532 9.89733C30.4393 9.87601 30.4242 9.8555 30.408 9.83582C30.3965 9.81908 30.384 9.80315 30.3703 9.78811C30.3527 9.76676 30.3327 9.74542 30.3138 9.72532L30.2887 9.69767L21.003 0.411943C20.9704 0.380546 20.9352 0.349153 20.9 0.320268C20.8649 0.291384 20.8674 0.295176 20.8511 0.282617C20.8347 0.270059 20.8096 0.251177 20.7883 0.237363L20.728 0.200938L20.669 0.165801C20.6489 0.154499 20.6288 0.145678 20.6074 0.135632L20.5434 0.10675C20.5233 0.0979587 20.5032 0.0917188 20.4831 0.0841837L20.4128 0.0590422L20.3525 0.0439573L20.2784 0.0264196C20.2558 0.0264196 20.2332 0.0188429 20.2106 0.0150753C20.188 0.0113078 20.1641 0.00756231 20.1403 0.00630646C20.1011 0.00171018 20.0617 -0.000362607 20.0222 5.17535e-05H19.9808C19.9413 -0.000362607 19.9019 0.00171018 19.8627 0.00630646C19.8389 0.00630646 19.8163 0.00628438 19.7924 0.0150753C19.7685 0.0238662 19.7472 0.0213962 19.7246 0.0264196L19.6505 0.0439573L19.5902 0.0590422L19.5199 0.0841837C19.4998 0.0917188 19.4797 0.0979587 19.4596 0.10675C19.4395 0.115541 19.4169 0.125585 19.3955 0.135632C19.3742 0.145678 19.3541 0.154499 19.334 0.165801L19.275 0.200938L19.2147 0.237363C19.1934 0.251177 19.1733 0.267547 19.1519 0.282617C19.1306 0.297687 19.1193 0.306454 19.1029 0.320268C19.0866 0.334082 19.0326 0.380546 19 0.411943C18.9673 0.444595 18.9372 0.479736 18.9083 0.5149C18.8794 0.550064 18.8832 0.548857 18.8706 0.565183C18.858 0.581509 18.8392 0.605338 18.8254 0.626687C18.8116 0.648037 18.8003 0.666904 18.7877 0.688253C18.7752 0.709603 18.7639 0.725924 18.7538 0.746017C18.7438 0.766111 18.7337 0.78746 18.7237 0.80881C18.7136 0.830159 18.7036 0.850253 18.6948 0.871602C18.686 0.892951 18.6785 0.913045 18.6709 0.934394L18.6471 1.00222C18.6471 1.02356 18.637 1.04488 18.6307 1.06623C18.6245 1.08758 18.6182 1.11271 18.6144 1.13657C18.6106 1.16043 18.6056 1.18556 18.6031 1.20942C18.6006 1.23328 18.5956 1.25209 18.5931 1.27344C18.5931 1.31865 18.5868 1.36387 18.5868 1.40908V12.777L0.968602 18.6556C0.791996 18.7145 0.628726 18.8076 0.488126 18.9296C0.347526 19.0516 0.232353 19.2002 0.149193 19.3667C0.0660338 19.5333 0.0165229 19.7146 0.0034811 19.9003C-0.00956069 20.086 0.0141226 20.2724 0.073187 20.449C0.167048 20.7312 0.34735 20.9767 0.588531 21.1507C0.829711 21.3247 1.11954 21.4184 1.41694 21.4185C1.5665 21.4189 1.71522 21.396 1.85774 21.3507L18.578 15.7709V25.2438L10.3271 28.0243L10.3033 28.0343L10.2103 28.0707L10.1689 28.0908C10.1413 28.1034 10.1136 28.1172 10.0873 28.1322L10.0395 28.1611L9.97172 28.2038L9.91772 28.244L9.86372 28.288L9.8072 28.3382L9.77707 28.3658L9.76074 28.3846C9.74316 28.4022 9.72809 28.4198 9.71176 28.4387C9.69543 28.4575 9.68036 28.4751 9.66529 28.4939L9.63139 28.5404C9.61381 28.563 9.59748 28.5868 9.58241 28.6094L9.56106 28.6472C9.54474 28.6748 9.52841 28.7024 9.51459 28.7313C9.50882 28.7418 9.50378 28.7527 9.49952 28.7639C9.48433 28.7936 9.47091 28.8243 9.45934 28.8556L9.44552 28.8933C9.43548 28.9222 9.42543 28.9523 9.41664 28.9825C9.40785 29.0126 9.40785 29.0176 9.40408 29.034C9.40032 29.0503 9.39152 29.0867 9.3865 29.1131C9.38183 29.135 9.37848 29.1572 9.37645 29.1796C9.37645 29.2022 9.37645 29.2236 9.36766 29.2449C9.35887 29.2663 9.36766 29.2964 9.36766 29.3216C9.36766 29.3467 9.36766 29.3617 9.36766 29.3818V29.4571C9.36766 29.4785 9.36766 29.4999 9.36766 29.5212C9.36766 29.5426 9.36766 29.5652 9.37771 29.5865C9.38776 29.6079 9.38524 29.6368 9.39026 29.6619C9.39529 29.687 9.39906 29.6983 9.40408 29.7159C9.40911 29.7334 9.41916 29.7736 9.42795 29.8025C9.42738 29.8088 9.42738 29.8151 9.42795 29.8214L9.44302 29.8603C9.45055 29.8791 9.45683 29.8993 9.46562 29.9181C9.47441 29.9369 9.48822 29.9696 9.50078 29.9947C9.51334 30.0198 9.51208 30.0198 9.51836 30.0311C9.53846 30.0688 9.55981 30.1052 9.58241 30.1404L9.6 30.1655C9.6195 30.1945 9.64046 30.2226 9.66279 30.2496L9.68162 30.2747C9.70674 30.3049 9.73311 30.3337 9.76074 30.3614L9.76827 30.3701L9.77958 30.3815L9.78711 30.3877L18.9836 39.5856C19.0163 39.6182 19.0514 39.6484 19.0866 39.6785L19.1368 39.7149C19.1565 39.7311 19.1771 39.7462 19.1984 39.7601L19.2587 39.7978C19.2788 39.8091 19.2976 39.8217 19.3177 39.8317C19.3378 39.8418 19.3591 39.8531 19.3805 39.8631L19.4433 39.892L19.5061 39.9146L19.5739 39.9384L19.6367 39.9548L19.7083 39.9723L19.7823 39.9837L19.8451 39.9925C19.8914 39.9975 19.938 40 19.9845 40C20.0315 40 20.0785 39.9975 20.1252 39.9925L20.188 39.9837L20.2621 39.9723L20.3337 39.9548L20.3965 39.9384L20.4643 39.9146L20.5271 39.892L20.5898 39.8631C20.6112 39.8531 20.6325 39.843 20.6526 39.8317C20.6727 39.8204 20.6916 39.8091 20.7117 39.7978L20.7719 39.7601C20.7933 39.7462 20.8138 39.7311 20.8335 39.7149L20.8837 39.6785C20.9189 39.6484 20.954 39.6182 20.9867 39.5856C21.0181 39.5529 21.0495 39.519 21.0784 39.4826C21.0922 39.4663 21.1035 39.4499 21.116 39.4324C21.1286 39.4148 21.1474 39.3922 21.1613 39.3708C21.1751 39.3495 21.1864 39.3306 21.1989 39.3105C21.2115 39.2904 21.2228 39.2716 21.2328 39.2527C21.2429 39.2339 21.2529 39.2101 21.263 39.1887C21.273 39.1674 21.2831 39.1473 21.2919 39.1272C21.3007 39.1071 21.3082 39.0845 21.3157 39.0644C21.3233 39.0443 21.3321 39.0192 21.3396 38.9953C21.3471 38.9715 21.3496 38.9539 21.3559 38.9325C21.3622 38.9112 21.3685 38.8848 21.3722 38.861C21.3772 38.8369 21.381 38.8126 21.3835 38.7881C21.3835 38.7668 21.3911 38.7454 21.3936 38.724C21.3936 38.6788 21.3936 38.6349 21.3936 38.5897V27.2808L39.0155 21.3406C39.1937 21.2835 39.3588 21.1917 39.5013 21.0705C39.6438 20.9493 39.7609 20.801 39.8458 20.6343C39.9307 20.4675 39.9817 20.2856 39.9959 20.0991C40.0101 19.9125 39.9872 19.725 39.9285 19.5473ZM21.4162 4.83629L26.6618 10.0807L21.4162 11.8314V4.83629ZM18.5818 35.165L13.4027 29.9858L18.5818 28.239V35.165Z" fill="white"/>
                        </svg>

                        {/* <img src='' alt='Apex Fusion logo'/> */}
                    </Button>
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

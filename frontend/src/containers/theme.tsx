import { createTheme } from "@mui/material";
import { menuDark, white, menuOverlay } from "./AppContainer";

export const theme = createTheme({
	components: {
		// MuiButton
		MuiButton: {
			styleOverrides: {
				root: {
					textTransform: 'none', // Disables the default uppercase transformation
					backgroundColor: menuDark,
					color: white,
					'&:hover': {
						backgroundColor: menuDark,
						color: white,
					}
				},
			},
		},
		// App bar
		MuiAppBar: {
			styleOverrides: {
				root: {
					backgroundColor: menuDark,
					color: white,
					'&:hover': {
						backgroundColor: menuDark,
						color: white,
					}
				}
			}
		},
		// mui menu
		MuiMenu: {
			styleOverrides: {
				root: {
					backgroundColor: menuOverlay,
				},
				paper: {
					color: white,
					backgroundColor: menuDark,
					'& ul': {
						backgroundColor: menuDark,
						padding: '10px', // Add padding to ul
						borderRadius: '8px', // Round the corners of ul
					},
					'& li': {
						'&:hover': {
							backgroundColor: menuDark,
						},
					},
					icon: {
						color: white,
					},
				},
			}
		},
		MuiListItemIcon: {
			styleOverrides: {
				root: {
					color: white
				}
			}
		},
		MuiSelect: {
			styleOverrides: {
				root: {
					color: white,
					backgroundColor: menuDark,
				},
				icon: {
					color: white,
				}
			}
		},
	},
});

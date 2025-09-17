import { hexToRgb } from '@mui/material/styles';
import { createTheme } from '@mui/material';

// defined colors used in theme
export const menuDark = '#051D26';
export const white = '#ffffff';
export const menuOverlay = `rgba(${hexToRgb(menuDark)},0.6)`;

// TODO AF- NOT USED FOR NOW
export const theme2 = createTheme({
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
					},
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
					},
				},
			},
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
						backgroundColor: menuDark,
						color: white,
						'& svg': {
							color: white,
						},
						'&:hover': {
							backgroundColor: white,
							color: menuDark,
							'& svg': {
								color: menuDark,
							},
						},
					},
				},
			},
		},
	},
});

export const theme = createTheme({});

import { Button, styled } from '@mui/material';
import React from 'react';
import { primaryAccentColor } from '../../containers/theme';

interface ButtonCustomProps {
	onClick?: () => void;
	disabled?: boolean;
	sx?: object;
	children?: React.ReactNode; // Add children prop
	variant?: 'primary' | 'secondary' | 'navigation' | 'navigationActive';
	id?: string;
}

const variantStyles = {
	primary: {
		padding: '14px 24px',
		color: '#161616',
		backgroundColor: primaryAccentColor,
		border: '1px solid transparent',
		'&:hover': {
			boxShadow: 'none',
			color: 'white',
			backgroundColor: 'transparent',
			border: `1px solid ${primaryAccentColor}`,
		},
	},
	secondary: {
		border: '1px solid',
		borderColor: primaryAccentColor,
		color: 'white',
		backgroundColor: 'transparent',
		padding: '14px 24px',
		'&:hover': {
			boxShadow: 'none',
			color: '#161616',
			backgroundColor: primaryAccentColor,
		},
	},
	navigation: {
		border: '1px solid',
		borderColor: 'transparent',
		color: 'white',
		backgroundColor: 'transparent',
		padding: '10px 24px',
		'&:hover': {
			boxShadow: 'none',
			backgroundColor: 'transparent',
		},
	},
	navigationActive: {
		border: '1px solid',
		borderColor: 'transparent',
		color: primaryAccentColor,
		backgroundColor: 'transparent',
		padding: '10px 24px',
		'&:hover': {
			boxShadow: 'none',
			backgroundColor: 'transparent',
		},
	},
};

const ButtonCustom: React.FC<ButtonCustomProps> = ({
	onClick,
	disabled,
	sx,
	children,
	variant = 'primary',
	id,
}) => {
	const CustomButton = styled(Button)({
		boxShadow: 'none',
		borderRadius: '100px',
		textTransform: 'capitalize',
		fontWeight: 600,
		...variantStyles[variant],
		...sx,
	});

	return (
		<CustomButton onClick={onClick} disabled={disabled} id={id}>
			{children}
		</CustomButton>
	);
};

export default ButtonCustom;

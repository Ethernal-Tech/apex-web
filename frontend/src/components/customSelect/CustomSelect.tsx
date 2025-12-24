import React from 'react';
import {
	Select,
	MenuItem,
	ListItemIcon,
	ListItemText,
	FormControl,
	SelectChangeEvent,
	SxProps,
	Theme,
	Box,
	lighten,
	Typography,
} from '@mui/material';
import { styled } from '@mui/system';

interface Option {
	value: string;
	label: string;
	icon: React.FC;
	borderColor: string;
}

interface CustomSelectProps {
	label: string;
	icon: React.FC;
	value: string;
	disabled?: boolean;
	onChange: (event: SelectChangeEvent<string>) => void;
	options: Option[];
	sx?: SxProps<Theme>;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
	icon: IconComponent,
	value,
	disabled = false,
	onChange,
	options,
}) => {
	const StyledFormControl = styled(FormControl)(() => ({
		'& .MuiSelect-select': {
			backgroundColor: '#424543',
			padding: '8px 15px',
			borderRadius: '12px!important',
		},
		// handled disabled state
		'& .Mui-disabled': {
			'& .MuiSvgIcon-root': {
				display: 'none',
			},
			'& .MuiTypography-root': {
				WebkitTextFillColor: 'white',
			},
		},

		'& .MuiOutlinedInput-root': {
			backgroundColor: 'transparent',

			'& fieldset': {
				border: '2px solid transparent',
				transition: 'border-color 0.3s ease',
				borderRadius: '12px',
			},

			'&:hover fieldset': {
				backgroundColor: 'transparent',
				border: '2px solid #858c88',
			},
			'& .MuiSvgIcon-root': {
				fill: 'white',
			},
		},
	}));

	const StyledMenuItem = styled(MenuItem)(() => ({
		backgroundColor: '#424543',
		padding: '8px 15px',
		color: 'white',
		'&.Mui-selected': {
			backgroundColor: '#424543',
			'&:hover': {
				backgroundColor: lighten('#424543', 0.1),
			},
		},
		'&:hover': {
			backgroundColor: lighten('#424543', 0.1),
		},
	}));

	return (
		<StyledFormControl>
			<Select
				value={value}
				onChange={onChange}
				disabled={disabled}
				renderValue={(selected) => (
					<Box sx={{ display: 'flex', alignItems: 'center' }}>
						<ListItemIcon
							style={{
								minWidth: 0,
								marginRight: 8,
								color: 'white',
							}}
						>
							<IconComponent />
						</ListItemIcon>
						<Typography sx={{ fontWeight: 500 }}>
							{
								options.find(
									(option) => option.value === selected,
								)?.label
							}
						</Typography>
					</Box>
				)}
				MenuProps={{
					PaperProps: {
						sx: {
							backgroundColor: '#424543',
							color: 'white',
							'& .MuiMenu-list': {
								paddingTop: '0',
								paddingBottom: '0',
							},
						},
					},
				}}
				sx={{ color: 'white' }}
			>
				{options.map((option) => (
					<StyledMenuItem
						key={option.value}
						value={option.value}
						selected={option.value === value}
					>
						<ListItemIcon
							style={{
								minWidth: 0,
								marginRight: 8,
								color: 'white',
							}}
						>
							<option.icon />
						</ListItemIcon>
						<ListItemText primary={option.label} />
					</StyledMenuItem>
				))}
			</Select>
		</StyledFormControl>
	);
};

export default CustomSelect;

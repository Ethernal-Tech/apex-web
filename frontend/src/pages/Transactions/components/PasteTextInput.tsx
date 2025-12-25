import React from 'react';
import { TextField, Button, Box, styled, SxProps, Theme } from '@mui/material';
import { primaryAccentColor } from '../../../containers/theme';

const CustomTextField = styled(TextField)({
	'& .MuiOutlinedInput-root': {
		'& fieldset': {
			borderColor: 'transparent',
		},
		'&:hover fieldset': {
			borderColor: 'transparent',
		},
		'&.Mui-focused fieldset': {
			borderColor: 'transparent',
		},
		backgroundColor: '#424543',
		borderRadius: '8px',
		color: 'white',
		width: '100%',
		caretColor: primaryAccentColor,
	},
	input: {
		color: 'white',
		caretColor: primaryAccentColor,
		fonteight: 500,
		padding: '13px 15px',
	},
});

const CustomButton = styled(Button)({
	backgroundColor: 'transparent',
	boxShadow: 'none',
	color: primaryAccentColor,
	borderRadius: 4,
	marginLeft: 8,
	textTransform: 'none',
	'&:hover': {
		backgroundColor: 'transparent',
		boxShadow: 'none',
	},
	position: 'absolute',
	top: '50%',
	right: 0,
	transform: 'translateY(-50%)',
});

interface PasteTextInputProps {
	sx?: SxProps<Theme>;
	text: string;
	setText: (text: string) => void;
	disabled?: boolean;
	id?: string;
}

const PasteTextInput: React.FC<PasteTextInputProps> = ({
	sx,
	text,
	setText,
	disabled,
	id,
}) => {
	const handlePasteClick = async () => {
		try {
			const textFromClipboard = await navigator.clipboard.readText();
			setText(textFromClipboard);
		} catch (err) {
			console.error('Failed to read clipboard contents: ', err);
		}
	};

	return (
		<Box display="flex" alignItems="center" position="relative" sx={sx}>
			<CustomTextField
				fullWidth
				value={text}
				onChange={(e) => setText(e.target.value)}
				disabled={disabled}
				id={id}
			/>
			{!text && (
				<CustomButton variant="contained" onClick={handlePasteClick}>
					PASTE
				</CustomButton>
			)}
		</Box>
	);
};

export default PasteTextInput;

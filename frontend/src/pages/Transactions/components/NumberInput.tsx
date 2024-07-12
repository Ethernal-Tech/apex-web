import React, { useState } from 'react';
import { TextField, Button, Box, styled, SxProps, Theme } from '@mui/material';
// import './CustomStyles.css'; // Import the CSS file

const totalBalance = 5000.000456;  // Define the total balance variable

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
    backgroundColor: 'transparent',
    // borderRadius: '8px',
    border: 'none',
    color: 'white',
    padding: '0 8px',
    width: '100%',
    caretColor: '#FF5E5E',
  },
  input: {
    fontSize: '1.5rem',
    color: 'white',
    caretColor: '#FF5E5E',
    '&::placeholder': {
      color: '#a3a3a3',
      opacity: 1,
      fontFamily: 'monospace', // Adjust as needed to match the style
    },
    // Hide number input arrows
    '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
      display: 'none',
    },
    '-webkit-appearance': 'none',
    '&[type=number]': {
      '-moz-appearance': 'textfield', // Firefox
    },
  },
});

const CustomButton = styled(Button)({
  backgroundColor: 'transparent',
  boxShadow: 'none',
  color: '#FF5E5E',
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
}

const PasteTextInput: React.FC<PasteTextInputProps> = ({ sx }) => {
  const [text, setText] = useState('');

  const handleMaxClick = () => {
    setText(totalBalance.toString());
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'e' || event.key === 'E') {
      event.preventDefault();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const paste = event.clipboardData.getData('text');
    if (paste.match(/[^0-9.]/)) {
      event.preventDefault();
    }
  };

  return (
    <Box display="flex" alignItems="center" width="100%" position="relative" sx={sx}>
      <CustomTextField
        type="number"  // Set the input type to number
        variant="outlined"
        fullWidth
        placeholder="0.000000"  // Custom placeholder
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
      {!text && (
        <CustomButton variant="contained" onClick={handleMaxClick}>
          MAX
        </CustomButton>
      )}
    </Box>
  );
};

export default PasteTextInput;

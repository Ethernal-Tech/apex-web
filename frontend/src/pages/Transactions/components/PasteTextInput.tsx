import React from 'react';
import { TextField, Button, Box, styled, SxProps, Theme } from '@mui/material';
import appSettings from '../../../settings/appSettings';

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
    backgroundColor: '#19232d',
    borderRadius: '8px',
    border:'1px solid #435F69',
    color: 'white',
    padding: '0 8px',
    width: '100%',
    caretColor: appSettings.isSkyline ? '#1ea29d' : '#FF5E5E'
  },
  input: {
    color: 'white',
    caretColor: appSettings.isSkyline ? '#1ea29d' : '#FF5E5E'
  },
});

const CustomButton = styled(Button)({
  backgroundColor: 'transparent',
  boxShadow:'none',
  color: appSettings.isSkyline ? '#1ea29d' : '#FF5E5E',
  borderRadius: 4,
  marginLeft: 8,
  textTransform: 'none',
  '&:hover': {
    backgroundColor: 'transparent',
    boxShadow:'none'
  },
  position:'absolute',
  top:'50%',
  right:0,
  transform:'translateY(-50%)'
});

interface PasteTextInputProps {
    sx?: SxProps<Theme>;
    text: string
    setText: (text: string) => void
    disabled?: boolean;
  }

const PasteTextInput:React.FC<PasteTextInputProps> = ({sx, text, setText, disabled}) => {

  const handlePasteClick = async () => {
    try {
      const textFromClipboard = await navigator.clipboard.readText();
      setText(textFromClipboard);
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
    }
  };

  return (
    <Box display="flex" alignItems="center" width="100%" position="relative" sx={sx}>
      <CustomTextField 
        variant="outlined" 
        fullWidth
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
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

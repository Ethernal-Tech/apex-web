import React from 'react';
import { TextField, Button, Box, styled, SxProps, Theme, Typography } from '@mui/material';
import { convertApexToDfm, convertDfmToApex, toFixedFloor } from '../../../utils/generalUtils';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';
import appSettings from '../../../settings/appSettings';
// import './CustomStyles.css'; // Import the CSS file


// const apexPriceInDollars = NaN // fiat price doesn't exist for apex

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
    padding: '0 8px 0 0',
    width: '100%',
    caretColor: appSettings.isSkyline ? '#1ea29d' : '#FF5E5E',
  },
  input: {
    fontSize: '1.5rem',
    color: 'white',
    paddingLeft:0,
    caretColor: appSettings.isSkyline ? '#1ea29d' : '#FF5E5E',
    '&::placeholder': {
      color: '#a3a3a3',
      opacity: 1,
      fontFamily: 'monospace', // Adjust as needed to match the style
    },
    // Hide number input arrows
    '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
      display: 'none',
    },
    'webkitAppearance': 'none',
    '&[type=number]': {
      'mozAppearance': 'textfield', // Firefox
    },
  },
});

const CustomButton = styled(Button)({
  backgroundColor: 'transparent',
  boxShadow: 'none',
  color: appSettings.isSkyline ? '#1ea29d' : '#FF5E5E',
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

interface PasteApexAmountInputProps {
  sx?: SxProps<Theme>;
  maxSendable: string | null
  text: string
  setAmount: (text: string) => void
  disabled?: boolean;
}

const PasteApexAmountInput: React.FC<PasteApexAmountInputProps> = ({ sx, maxSendable, text, setAmount, disabled }) => {
  const chain = useSelector((state: RootState)=> state.chain.chain);

  // TODO: depending on selected token, update logic for maxSendable because we use same input.
  // To do this we need to know logic for validating/parsing native token amount (WAda / WAPEX)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>{
    if(!maxSendable){
      return e.preventDefault()
    }

    const apexInput = e.target.value;
    // check right side decimals
    const [,right] = apexInput.split('.')
    if(right && right.length >6) {
      return e.preventDefault()
    }
    
    const dfmValueInput = convertApexToDfm(apexInput,chain)
    if (BigInt(dfmValueInput) < 0) {
      e.preventDefault()
      return setAmount('')
    }

    setAmount(apexInput)
  }
  
  const handleMaxClick = () => {
    if(maxSendable){
      setAmount(toFixedFloor(convertDfmToApex(maxSendable,chain), 6));
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'e' || event.key === 'E' || event.key === 'space' || event.key === '-') {
      event.preventDefault();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const paste = event.clipboardData.getData('text');
    if (paste.match(/[^0-9.]/)) {
      event.preventDefault();
    }
  };

  // returns true if value of input equals max amount a user can send
  const isMaxAmountEntered = () => maxSendable && BigInt(maxSendable) > 0 && convertApexToDfm(text, chain) !== maxSendable.toString();
  
  // Returns true if entered value to send exceedes the maximum amount a user can send (balance - fees)
  const hasInsufficientBalance = () => maxSendable && BigInt(convertApexToDfm(text, chain)) > BigInt(maxSendable);

  return (
    <Box sx={sx}>
        <Box sx={{position:'relative'}} display="flex" alignItems="center" width="100%" position="relative">
            <CustomTextField
                type="number"  // Set the input type to number
                variant="outlined"
                fullWidth
                placeholder="0.000000"  // Custom placeholder
                value={text}
                onChange={(e) => handleInputChange(e)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                disabled={disabled}
                sx={{paddingRight:'50px'}}
            />
            {/* show max button only if enough funds present, and entered value varies from actual max amount */}
            {isMaxAmountEntered() && (
                <CustomButton variant="contained" onClick={handleMaxClick}>
                  MAX
                </CustomButton>
            )}
            { hasInsufficientBalance() &&
              <Typography sx={{color:'#ff5e5e',position:'absolute',bottom:0,left:0}}>Insufficient funds</Typography>
            }
        </Box>
        {/* TODO - removed, as APEX doesn't have a price in fiat equivalent */}
        {/* <Typography sx={{color: '#A1B3A0'}}>&#36;
            {(+totalBalance * apexPriceInDollars).toFixed(2)}
        </Typography> */}
    </Box>
  );
};

export default PasteApexAmountInput;

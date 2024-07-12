import { Button, styled } from '@mui/material';
import React from 'react';

interface ButtonCustomProps {
    onClick?: () => void;
    sx?: object;
    children?: React.ReactNode;  // Add children prop
    variant?:'red'|'redNavigation'|'white'|'whiteNavigation'|'navigation'
  }

const variantStyles  ={
  red:{
      border: '1px solid',
      borderColor: '#F25041',
      color: 'white',
      backgroundColor: 'transparent',
      padding: '14px 24px',
      '&:hover':{
          boxShadow: 'none',
          backgroundColor:'transparent'
      }
  },
  redNavigation:{
      border: '1px solid',
      borderColor: '#F25041',
      color: 'white',
      backgroundColor: 'transparent',
      padding: '10px 24px',
      '&:hover':{
          boxShadow: 'none',
          backgroundColor:'transparent'
      },
      py:'10px'
  },
  white: {
      border: '1px solid',
      borderColor: 'white',
      color: 'black',
      backgroundColor: 'white',
      padding: '14px 24px',
      '&:hover':{
          boxShadow: 'none',
          backgroundColor:'white'
      }
  },
  whiteNavigation:{
    border: '1px solid',
    borderColor: 'white',
    color: 'black',
    backgroundColor: 'white',
    padding: '10px 24px',
    '&:hover':{
        boxShadow: 'none',
        backgroundColor:'white'
    },
  },
  navigation:{
    border: '1px solid',
    borderColor: 'transparent',
    color: 'white',
    backgroundColor: 'transparent',
    padding: '10px 24px',
    '&:hover':{
      boxShadow: 'none',
      backgroundColor:'transparent'
    },
  },
}

const ButtonCustom: React.FC<ButtonCustomProps> = ({ onClick, sx, children, variant = 'white' }) => {
    const CustomButton = styled(Button)({
        boxShadow: 'none',
        borderRadius: '8px',
        textTransform: 'capitalize',
        fontWeight:600,
        ...variantStyles[variant],
        ...sx
    });
    
  return (
    <CustomButton
      onClick={onClick}
    >
      {children}
    </CustomButton>
  );
};

export default ButtonCustom;

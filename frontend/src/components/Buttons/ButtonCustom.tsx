import { Button, styled } from '@mui/material';
import React from 'react';

interface ButtonCustomProps {
    onClick?: () => void;
    disabled?: boolean;
    sx?: object;
    children?: React.ReactNode;  // Add children prop
    variant?:'red'|'redNavigation'|'white'|'whiteNavigation'|'navigation'|'navigationActive'|'whiteSkyline'|'redSkyline'
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
          backgroundColor:'#F25041'
      }
  },
  redSkyline:{
    border: '1px solid',
    borderColor: '#0b5855',
    color: 'white',
    backgroundColor: 'transparent',
    padding: '14px 24px',
    '&:hover':{
        boxShadow: 'none',
        backgroundColor:'#188a85'
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
      border: 'none',
      color: 'black',
      backgroundColor: 'white',
      padding: '14px 24px',
      '&:hover':{
          boxShadow: 'none',
          backgroundColor:'#F27B50'
      }
  },
  whiteSkyline: {
    border: 'none',
    color: '#0b5855',
    backgroundColor: 'white',
    padding: '14px 24px',
    '&:hover':{
        boxShadow: 'none',
        color: 'white',
        backgroundColor:'#0b5855'
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
  navigationActive:{
    border: '1px solid',
    borderColor: 'transparent',
    color: '#F25041',
    backgroundColor: 'transparent',
    padding: '10px 24px',
    '&:hover':{
      boxShadow: 'none',
      backgroundColor:'transparent'
    },
  },
}

const ButtonCustom: React.FC<ButtonCustomProps> = ({ onClick, disabled, sx, children, variant = 'white' }) => {
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
      disabled={disabled}
    >
      {children}
    </CustomButton>
  );
};

export default ButtonCustom;

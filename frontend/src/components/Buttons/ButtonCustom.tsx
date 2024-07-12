import { Button, styled } from '@mui/material';
import React from 'react';

interface ButtonCustomProps {
    onClick?: () => void;
    sx?: object;
    children?: React.ReactNode;  // Add children prop
    variant?:'red'|'white'
  }

  const variantStyles  ={
      red:{
          border: '1px solid',
          borderColor: '#F25041',
          color: 'white',
          backgroundColor: 'transparent',
          '&:hover':{
              boxShadow: 'none',
              backgroundColor:'transparent'
          }
      },
      white: {
          border: '1px solid',
          borderColor: 'white',
          color: 'black',
          backgroundColor: 'white',
          '&:hover':{
              boxShadow: 'none',
              backgroundColor:'white'
          }
      }
  }

const ButtonCustom: React.FC<ButtonCustomProps> = ({ onClick, sx, children, variant = 'white' }) => {
    const CustomButton = styled(Button)({
        ...variantStyles[variant],
        boxShadow: 'none',
        borderRadius: '8px',
        textTransform: 'uppercase',
        fontWeight:600,
        // adding chosen variant
        padding: '14px 24px',
    });
    
  return (
    <CustomButton
      onClick={onClick}
      sx={{

        ...sx,
      }}
    >
      {children}
    </CustomButton>
  );
};

export default ButtonCustom;

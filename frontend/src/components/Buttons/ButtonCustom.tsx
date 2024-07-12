import { Button, styled } from '@mui/material';
import React from 'react';

interface ButtonCustomProps {
    onClick?: () => void;
    sx?: object;
    children?: React.ReactNode;  // Add children prop
    variant?:'red'|'redNavigation'|'white'|'whiteNavigation'
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
        py:'10px'
    },
  }

const ButtonCustom: React.FC<ButtonCustomProps> = ({ onClick, sx, children, variant = 'white' }) => {
    const CustomButton = styled(Button)({
        // adding chosen variant
        boxShadow: 'none',
        borderRadius: '8px',
        textTransform: 'uppercase',
        fontWeight:600,
        ...variantStyles[variant],
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

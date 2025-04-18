import React from 'react';
import { Select, MenuItem, ListItemIcon, ListItemText, FormControl, SelectChangeEvent, SxProps, Theme, Box, lighten, Typography } from '@mui/material';
import { styled } from '@mui/system';
import { menuDark } from '../../containers/theme';

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
  disabled?: boolean,
  onChange: (event: SelectChangeEvent<string>) => void;
  options: Option[];
  sx?: SxProps<Theme>;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ label, icon: IconComponent, value, disabled = false, onChange, options }) => {
  const StyledFormControl = styled(FormControl)(() => ({
    borderRadius: '4px',
    border: '1px solid',
    borderColor: options.find(option => option.value === value)?.borderColor,
    '& .MuiSelect-select':{
      padding:'12px 15px',
    },
    '& .MuiTypography-root':{
      color:'white'
    },
    '& .Mui-disabled':{
      '& .MuiSvgIcon-root':{
        display:'none'
      },
      '& .MuiTypography-root':{
        WebkitTextFillColor:'white',
      },
    },
    '& .MuiOutlinedInput-root': {
      backgroundColor: 'transparent',
      '& fieldset': {
        borderColor: 'none',
      },
      '&:hover fieldset': {
        borderColor: 'none',
      },
      '&.Mui-focused fieldset': {
        borderColor: 'none',
      },
      '&.Mui-focused': {
        outline: 'none',
      },
    },
    '& .MuiSvgIcon-root': {
      fill: 'white',
    },
    width:'260px' // TODO AF - see if this can be passed in from parent prop, might be more managable
  }));

  const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
    backgroundColor: menuDark,
    color: 'white',
    '&.Mui-selected': {
      backgroundColor: menuDark,
      '&:hover':{
        backgroundColor: lighten(menuDark,0.1),
      }
    },
    '&:hover': {
      backgroundColor: lighten(menuDark,0.1),
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
            <ListItemIcon style={{ minWidth: 0, marginRight: 8, color: 'white' }}>
              <IconComponent />
            </ListItemIcon>
            <Typography>{options.find(option => option.value === selected)?.label}</Typography>
          </Box>
        )}
        MenuProps={{
          PaperProps: {
            sx: {
              backgroundColor: menuDark,
              color: 'white',
            }
          }
        }}
        sx={{
          backgroundColor: options.find(option => option.value === value)?.borderColor, // Full color for selected
          color: 'white',
        }}
      >
        {options.map((option) => (
          <StyledMenuItem
            key={option.value}
            value={option.value}
            selected={option.value === value}
          >
            <ListItemIcon style={{ minWidth: 0, marginRight: 8, color: 'white' }}>
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

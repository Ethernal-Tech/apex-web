import React from 'react';
import { Select, MenuItem, ListItemIcon, ListItemText, FormControl, SelectChangeEvent, SxProps, Theme, Box, lighten } from '@mui/material';
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
  onChange: (event: SelectChangeEvent<string>) => void;
  options: Option[];
  sx?: SxProps<Theme>;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ label, icon: IconComponent, value, onChange, options, sx }) => {
  const StyledFormControl = styled(FormControl)(({ sx }) => ({
    borderRadius: '4px',
    border: '1px solid',
    color: 'white',
    borderColor: options.find(option => option.value === value)?.borderColor,
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
      color: 'white',
    },
    ...sx
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
    <StyledFormControl
      fullWidth
      sx={{...sx}}
    >
      <Select
        value={value}
        onChange={onChange}
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'white' }}>
            <ListItemIcon style={{ minWidth: 0, marginRight: 8, color: 'white' }}>
              <IconComponent />
            </ListItemIcon>
            {options.find(option => option.value === selected)?.label}
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

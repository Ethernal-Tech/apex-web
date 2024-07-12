import React from 'react';
import { Select, MenuItem, ListItemIcon, ListItemText, FormControl, SelectChangeEvent, SxProps, Theme, Box } from '@mui/material';
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
  const StyledFormControl = styled(FormControl)(({ theme }) => ({
    borderRadius: '4px',
    border: '1px solid',
    borderColor: options.find(option => option.value === value)?.borderColor,
    color: 'white',
    '& .MuiOutlinedInput-root': {
      // color: 'white',
      backgroundColor: 'transparent',
      '& fieldset': {
        borderColor: 'currentColor',
      },
      '&:hover fieldset': {
        borderColor: 'currentColor',
      },
    },
    '& .MuiSvgIcon-root': {
      color: 'white',
    },
  }));
  
  const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
    backgroundColor: 'black', // TODO AF - FIX THIS
    color: 'white',
    '&:hover': {
      backgroundColor: options.find(option => option.value === value)?.borderColor,
    },
  }));


  return (
    <StyledFormControl
      variant="outlined"
      fullWidth
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
              backgroundColor: 'transparent',
              color: 'white',
            }
          }
        }}
      >
        {options.map((option) => (
          <StyledMenuItem
            key={option.value}
            value={option.value}
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

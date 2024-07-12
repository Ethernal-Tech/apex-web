import React from 'react';
import { Select, MenuItem, ListItemIcon, ListItemText, FormControl, InputLabel, SelectChangeEvent, SxProps, Theme, Box } from '@mui/material';

interface Option {
  value: string;
  label: string;
  icon: React.FC;
  borderColor: string
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
  return (
    <FormControl 
      variant="outlined" 
      fullWidth 
      sx={{
        borderRadius:'4px',
        border:'1px solid',
        borderColor: options.find(option=> option.value === value)?.borderColor,
        ...sx
    }}>
      <Select
        value={value}
        onChange={onChange}
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ListItemIcon style={{ minWidth: 0, marginRight: 8 }}>
              <IconComponent />
            </ListItemIcon>
            {options.find(option => option.value === selected)?.label}
          </Box>
        )}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            <ListItemIcon style={{ minWidth: 0, marginRight: 8 }}>
              <option.icon />
            </ListItemIcon>
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default CustomSelect;

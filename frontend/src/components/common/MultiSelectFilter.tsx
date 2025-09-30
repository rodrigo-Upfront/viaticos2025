import React, { useState } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  MenuItem,
  Checkbox,
  ListItemText,
  TextField,
  Box,
  Chip,
  SelectChangeEvent
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface FilterOption {
  id: string | number;
  name: string;
}

interface MultiSelectFilterProps {
  label: string;
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  options: FilterOption[];
  size?: 'small' | 'medium';
  minWidth?: number;
  placeholder?: string;
  disabled?: boolean;
}

const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  label,
  value,
  onChange,
  options,
  size = 'small',
  minWidth = 200,
  placeholder,
  disabled = false
}) => {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');

  // Filter options based on search text
  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleChange = (event: SelectChangeEvent<(string | number)[]>) => {
    const selectedValue = typeof event.target.value === 'string' 
      ? event.target.value.split(',') 
      : event.target.value;
    onChange(selectedValue);
  };

  const renderValue = (selected: (string | number)[]) => {
    if (selected.length === 0) {
      return <em>{placeholder || 'All'}</em>;
    }
    if (selected.length === 1) {
      const option = options.find(opt => opt.id === selected[0]);
      return option?.name || selected[0];
    }
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {selected.slice(0, 2).map((selectedId) => {
          const option = options.find(opt => opt.id === selectedId);
          return (
            <Chip
              key={selectedId}
              label={option?.name || selectedId}
              size="small"
              variant="outlined"
            />
          );
        })}
        {selected.length > 2 && (
          <Chip
            label={`+${selected.length - 2} more`}
            size="small"
            variant="outlined"
          />
        )}
      </Box>
    );
  };

  return (
    <FormControl size={size} sx={{ minWidth }} disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        value={value}
        onChange={handleChange}
        input={<OutlinedInput label={label} />}
        renderValue={renderValue}
        MenuProps={{
          PaperProps: {
            style: {
              maxHeight: 300,
            },
          },
        }}
      >
        {/* Search field inside dropdown */}
        <MenuItem disableRipple sx={{ position: 'sticky', top: 0, backgroundColor: 'background.paper', zIndex: 1 }}>
          <TextField
            size="small"
            placeholder={`${t('common.search')} ${label.toLowerCase()}...`}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            fullWidth
            variant="outlined"
          />
        </MenuItem>
        
        {/* Select All option */}
        <MenuItem
          disableRipple
          onClick={(e) => {
            e.stopPropagation();
            if (value.length === options.length) {
              onChange([]);
            } else {
              onChange(options.map(opt => opt.id));
            }
          }}
        >
          <Checkbox 
            checked={value.length === options.length}
            indeterminate={value.length > 0 && value.length < options.length}
          />
          <ListItemText primary={t('common.selectAll')} />
        </MenuItem>

        {/* Options */}
        {filteredOptions.map((option) => (
          <MenuItem key={option.id} value={option.id}>
            <Checkbox checked={value.indexOf(option.id) > -1} />
            <ListItemText primary={option.name} />
          </MenuItem>
        ))}
        
        {filteredOptions.length === 0 && searchText && (
          <MenuItem disabled>
            <ListItemText primary={t('common.noResults')} />
          </MenuItem>
        )}
      </Select>
    </FormControl>
  );
};

export default MultiSelectFilter;

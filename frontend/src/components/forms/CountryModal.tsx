import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
} from '@mui/material';

interface Country {
  id?: number;
  name: string;
  currency: string;
}

interface CountryModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (country: Country) => void;
  country?: Country;
  mode: 'create' | 'edit';
}

const CountryModal: React.FC<CountryModalProps> = ({
  open,
  onClose,
  onSave,
  country,
  mode
}) => {
  const [formData, setFormData] = useState<Country>({
    name: '',
    currency: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (country && mode === 'edit') {
      setFormData(country);
    } else {
      setFormData({ name: '', currency: '' });
    }
    setErrors({});
  }, [country, mode, open]);

  const handleChange = (field: keyof Country) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Country name is required';
    }

    if (!formData.currency.trim()) {
      newErrors.currency = 'Currency is required';
    } else if (formData.currency.length !== 3) {
      newErrors.currency = 'Currency must be 3 characters (e.g., USD, PEN)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSave(formData);
      onClose();
    }
  };

  const handleClose = () => {
    setFormData({ name: '', currency: '' });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'create' ? 'Add New Country' : 'Edit Country'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Country Name"
            value={formData.name}
            onChange={handleChange('name')}
            error={!!errors.name}
            helperText={errors.name}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Currency Code"
            value={formData.currency}
            onChange={handleChange('currency')}
            error={!!errors.currency}
            helperText={errors.currency || 'Use 3-letter ISO code (e.g., USD, PEN, CLP)'}
            margin="normal"
            required
            inputProps={{
              maxLength: 3,
              style: { textTransform: 'uppercase' }
            }}
            onInput={(e) => {
              const target = e.target as HTMLInputElement;
              target.value = target.value.toUpperCase();
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained">
          {mode === 'create' ? 'Create' : 'Update'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CountryModal;


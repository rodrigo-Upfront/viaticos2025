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

interface Currency {
  id?: number;
  name: string;
  code: string;
  symbol?: string;
}

interface CurrencyModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (currency: Currency) => void;
  currency?: Currency;
  mode: 'create' | 'edit';
}

const CurrencyModal: React.FC<CurrencyModalProps> = ({
  open,
  onClose,
  onSave,
  currency,
  mode
}) => {
  const [formData, setFormData] = useState<Currency>({
    name: '',
    code: '',
    symbol: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (currency && mode === 'edit') {
      setFormData(currency);
    } else {
      setFormData({ name: '', code: '', symbol: '' });
    }
    setErrors({});
  }, [currency, mode, open]);

  const handleChange = (field: keyof Currency) => (event: React.ChangeEvent<HTMLInputElement>) => {
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
      newErrors.name = 'Currency name is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Currency code is required';
    } else if (formData.code.length !== 3) {
      newErrors.code = 'Currency code must be exactly 3 characters (e.g., USD, EUR)';
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
    setFormData({ name: '', code: '', symbol: '' });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'create' ? 'Add New Currency' : 'Edit Currency'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Currency Name"
            value={formData.name}
            onChange={handleChange('name')}
            error={!!errors.name}
            helperText={errors.name}
            margin="normal"
            placeholder="e.g., US Dollar, Euro, British Pound"
            required
          />
          
          <TextField
            fullWidth
            label="Currency Code"
            value={formData.code}
            onChange={handleChange('code')}
            error={!!errors.code}
            helperText={errors.code}
            margin="normal"
            placeholder="e.g., USD, EUR, GBP"
            inputProps={{ maxLength: 3, style: { textTransform: 'uppercase' } }}
            required
          />
          
          <TextField
            fullWidth
            label="Currency Symbol"
            value={formData.symbol || ''}
            onChange={handleChange('symbol')}
            error={!!errors.symbol}
            helperText={errors.symbol || 'Optional currency symbol (e.g., $, €, £)'}
            margin="normal"
            placeholder="e.g., $, €, £"
          />

          {Object.keys(errors).length > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Please fix the errors above before saving.
            </Alert>
          )}
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

export default CurrencyModal;

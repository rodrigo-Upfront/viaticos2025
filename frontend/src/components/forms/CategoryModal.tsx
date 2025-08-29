import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  InputAdornment,
} from '@mui/material';

interface Category {
  id?: number;
  name: string;
  account: string;
  alertAmount: number;
}

interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (category: Category) => void;
  category?: Category;
  mode: 'create' | 'edit';
}

const CategoryModal: React.FC<CategoryModalProps> = ({
  open,
  onClose,
  onSave,
  category,
  mode
}) => {
  const [formData, setFormData] = useState<Category>({
    name: '',
    account: '',
    alertAmount: 0
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (category && mode === 'edit') {
      setFormData(category);
    } else {
      setFormData({ name: '', account: '', alertAmount: 0 });
    }
    setErrors({});
  }, [category, mode, open]);

  const handleChange = (field: keyof Category) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'alertAmount' ? parseFloat(event.target.value) || 0 : event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
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
      newErrors.name = 'Category name is required';
    }

    if (!formData.account.trim()) {
      newErrors.account = 'SAP account is required';
    }

    if (formData.alertAmount < 0) {
      newErrors.alertAmount = 'Alert amount cannot be negative';
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
    setFormData({ name: '', account: '', alertAmount: 0 });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'create' ? 'Add New Expense Category' : 'Edit Expense Category'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Category Name"
            value={formData.name}
            onChange={handleChange('name')}
            error={!!errors.name}
            helperText={errors.name}
            margin="normal"
            required
            placeholder="e.g., Food, Transportation, Accommodation"
          />
          
          <TextField
            fullWidth
            label="SAP Account Code"
            value={formData.account}
            onChange={handleChange('account')}
            error={!!errors.account}
            helperText={errors.account || 'SAP account code for integration'}
            margin="normal"
            required
            placeholder="e.g., 10001"
          />

          <TextField
            fullWidth
            label="Alert Amount"
            type="number"
            value={formData.alertAmount}
            onChange={handleChange('alertAmount')}
            error={!!errors.alertAmount}
            helperText={errors.alertAmount || 'Warning will be shown when expense exceeds this amount'}
            margin="normal"
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
            placeholder="0.00"
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

export default CategoryModal;


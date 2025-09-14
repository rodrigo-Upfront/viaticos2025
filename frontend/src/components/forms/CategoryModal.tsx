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
    account: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (category && mode === 'edit') {
      setFormData(category);
    } else {
      setFormData({ name: '', account: '' });
    }
    setErrors({});
  }, [category, mode, open]);

  const handleChange = (field: keyof Category) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
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
    setFormData({ name: '', account: '' });
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

          {/* Category-level alert removed; use per country/currency alerts */}
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


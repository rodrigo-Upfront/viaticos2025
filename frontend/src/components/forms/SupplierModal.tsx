import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
} from '@mui/material';

interface Supplier {
  id?: number;
  name: string;
  tax_name: string;
  sapCode: string;
}

interface SupplierModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (supplier: Supplier) => void;
  supplier?: Supplier;
  mode: 'create' | 'edit';
}

const SupplierModal: React.FC<SupplierModalProps> = ({
  open,
  onClose,
  onSave,
  supplier,
  mode
}) => {
  const [formData, setFormData] = useState<Supplier>({
    name: '',
    tax_name: '',
    sapCode: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (supplier && mode === 'edit') {
      setFormData(supplier);
    } else {
      setFormData({ name: '', tax_name: '', sapCode: '' });
    }
    setErrors({});
  }, [supplier, mode, open]);

  const handleChange = (field: keyof Supplier) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      
      // Auto-populate tax_name with name if tax_name is empty and we're changing name
      if (field === 'name' && !prev.tax_name) {
        newData.tax_name = value;
      }
      
      return newData;
    });
    
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
      newErrors.name = 'Supplier name is required';
    }

    if (!formData.tax_name.trim()) {
      newErrors.tax_name = 'Supplier Tax Name / RUC is required';
    }

    if (!formData.sapCode.trim()) {
      newErrors.sapCode = 'SAP code is required';
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
    setFormData({ name: '', tax_name: '', sapCode: '' });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'create' ? 'Add New Factura Supplier' : 'Edit Factura Supplier'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Supplier Name"
            value={formData.name}
            onChange={handleChange('name')}
            error={!!errors.name}
            helperText={errors.name}
            margin="normal"
            required
            placeholder="e.g., Restaurant Lima, Hotel Santiago"
          />
          
          <TextField
            fullWidth
            label="Supplier Tax Name / RUC"
            value={formData.tax_name}
            onChange={handleChange('tax_name')}
            error={!!errors.tax_name}
            helperText={errors.tax_name || 'Tax identification name (auto-populated from supplier name)'}
            margin="normal"
            required
            placeholder="e.g., Restaurant Lima S.A.C., RUC: 20123456789"
          />
          
          <TextField
            fullWidth
            label="SAP Code"
            value={formData.sapCode}
            onChange={handleChange('sapCode')}
            error={!!errors.sapCode}
            helperText={errors.sapCode || 'Unique SAP code for integration'}
            margin="normal"
            required
            placeholder="e.g., SUP001"
            inputProps={{
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

export default SupplierModal;


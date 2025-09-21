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
import { useTranslation } from 'react-i18next';

interface Tax {
  id?: number;
  code: string;
  regime: string;
  rate: number;
}

interface TaxModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (tax: Tax) => void;
  tax?: Tax;
  mode: 'create' | 'edit';
  loading?: boolean;
}

const TaxModal: React.FC<TaxModalProps> = ({
  open,
  onClose,
  onSave,
  tax,
  mode,
  loading = false
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Tax>({
    code: '',
    regime: '',
    rate: 0,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (tax && mode === 'edit') {
      setFormData(tax);
    } else {
      setFormData({
        code: '',
        regime: '',
        rate: 0,
      });
    }
    setErrors({});
  }, [tax, mode, open]);

  const handleChange = (field: keyof Tax) => (event: React.ChangeEvent<HTMLInputElement>) => {
    let value: any = event.target.value;
    if (field === 'rate') {
      // Handle rate field: convert to number, allow 0
      const numValue = parseFloat(event.target.value);
      value = isNaN(numValue) ? 0 : numValue;
    }
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

    if (!formData.code.trim()) {
      newErrors.code = t('taxes.codeRequired');
    }

    if (!formData.regime.trim()) {
      newErrors.regime = t('taxes.regimeRequired');
    }

    // Rate is now mandatory and must be a valid number
    if (typeof formData.rate !== 'number' || isNaN(formData.rate)) {
      newErrors.rate = t('taxes.rateRequired');
    } else if (formData.rate < 0 || formData.rate > 100) {
      newErrors.rate = t('taxes.rateInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleClose = () => {
    setFormData({
      code: '',
      regime: '',
      rate: 0,
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'create' ? t('taxes.addTax') : t('taxes.editTax')}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('taxes.taxNote')}
          </Alert>

          <TextField
            fullWidth
            label={`${t('taxes.code')} / ${t('taxes.codigo')}`}
            value={formData.code}
            onChange={handleChange('code')}
            error={!!errors.code}
            helperText={errors.code}
            margin="normal"
            required
            placeholder={t('taxes.codePlaceholder')}
          />

          <TextField
            fullWidth
            label={`${t('taxes.regime')} / ${t('taxes.regimen')}`}
            value={formData.regime}
            onChange={handleChange('regime')}
            error={!!errors.regime}
            helperText={errors.regime}
            margin="normal"
            required
            multiline
            rows={2}
            placeholder={t('taxes.regimePlaceholder')}
          />

          <TextField
            fullWidth
            label={t('taxes.rate')}
            value={formData.rate === 0 ? '0' : formData.rate}
            onChange={handleChange('rate')}
            error={!!errors.rate}
            helperText={errors.rate || t('taxes.rateHelp')}
            margin="normal"
            type="number"
            required
            inputProps={{ 
              min: 0, 
              max: 100, 
              step: 0.01 
            }}
            placeholder={t('taxes.ratePlaceholder')}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
        >
          {loading ? t('common.saving') : t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaxModal;

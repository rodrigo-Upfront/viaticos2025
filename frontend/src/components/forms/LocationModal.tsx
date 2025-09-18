import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Alert,
  Box,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

interface Location {
  id?: number;
  name: string;
  sap_code: string;
  cost_center: string;
}

interface LocationModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (location: Location) => Promise<void>;
  location?: Location;
  mode: 'create' | 'edit';
}

const LocationModal: React.FC<LocationModalProps> = ({
  open,
  onClose,
  onSave,
  location,
  mode
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation schema
  const schema = yup.object().shape({
    name: yup
      .string()
      .required(t('validation.required'))
      .min(2, t('validation.minLength', { min: 2 }))
      .max(255, t('validation.maxLength', { max: 255 })),
    sap_code: yup
      .string()
      .required(t('validation.required'))
      .min(1, t('validation.minLength', { min: 1 }))
      .max(50, t('validation.maxLength', { max: 50 }))
      .matches(/^[A-Z0-9]+$/, 'SAP code must contain only uppercase letters and numbers'),
    cost_center: yup
      .string()
      .required(t('validation.required'))
      .min(1, t('validation.minLength', { min: 1 }))
      .max(100, t('validation.maxLength', { max: 100 }))
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<Location>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      sap_code: '',
      cost_center: ''
    }
  });

  // Auto-uppercase SAP code
  const sapCodeValue = watch('sap_code');
  useEffect(() => {
    if (sapCodeValue) {
      setValue('sap_code', sapCodeValue.toUpperCase());
    }
  }, [sapCodeValue, setValue]);

  useEffect(() => {
    if (open) {
      setError(null);
      if (location && mode === 'edit') {
        reset({
          name: location.name || '',
          sap_code: location.sap_code || '',
          cost_center: location.cost_center || ''
        });
      } else {
        reset({
          name: '',
          sap_code: '',
          cost_center: ''
        });
      }
    }
  }, [open, location, mode, reset]);

  const onSubmit = async (data: Location) => {
    try {
      setLoading(true);
      setError(null);

      const locationData: Location = {
        ...data,
        sap_code: data.sap_code.toUpperCase().trim(),
        name: data.name.trim(),
        cost_center: data.cost_center.trim()
      };

      if (mode === 'edit' && location?.id) {
        locationData.id = location.id;
      }

      await onSave(locationData);
      onClose();
    } catch (err: any) {
      console.error('Error saving location:', err);
      setError(err.response?.data?.detail || 'Failed to save location');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>
        {mode === 'create' 
          ? t('configuration.addLocation') 
          : t('configuration.editLocation')
        }
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                {...register('name')}
                label={t('configuration.locationName')}
                fullWidth
                error={!!errors.name}
                helperText={errors.name?.message}
                disabled={loading}
                autoFocus
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                {...register('sap_code')}
                label={t('configuration.sapCode')}
                fullWidth
                error={!!errors.sap_code}
                helperText={errors.sap_code?.message || 'SAP code will be automatically converted to uppercase'}
                disabled={loading}
                placeholder="LIM001"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                {...register('cost_center')}
                label={t('configuration.costCenter')}
                fullWidth
                error={!!errors.cost_center}
                helperText={errors.cost_center?.message}
                disabled={loading}
                placeholder="CC-LIMA-HQ"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
              <strong>{t('common.note')}:</strong> {t('configuration.locationNote')}
            </Alert>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={handleClose}
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading ? t('common.saving') : t('common.save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default LocationModal;

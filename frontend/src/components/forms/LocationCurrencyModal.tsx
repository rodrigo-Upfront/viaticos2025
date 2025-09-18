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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { locationService, LocationCurrency, LocationCurrencyCreate } from '../../services/locationService';
import { currencyService, Currency } from '../../services/currencyService';

interface LocationCurrencyModalProps {
  open: boolean;
  onClose: () => void;
  locationId: number;
  locationName: string;
}

interface EditingCurrency {
  id: number;
  account: string;
}

const LocationCurrencyModal: React.FC<LocationCurrencyModalProps> = ({
  open,
  onClose,
  locationId,
  locationName
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationCurrencies, setLocationCurrencies] = useState<LocationCurrency[]>([]);
  const [availableCurrencies, setAvailableCurrencies] = useState<Currency[]>([]);
  const [editingCurrency, setEditingCurrency] = useState<EditingCurrency | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  // Validation schema for adding new currency
  const schema = yup.object().shape({
    currency_id: yup.number().required(t('validation.required')),
    account: yup
      .string()
      .required(t('validation.required'))
      .min(1, t('validation.minLength', { min: 1 }))
      .max(255, t('validation.maxLength', { max: 255 }))
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<LocationCurrencyCreate>({
    resolver: yupResolver(schema),
    defaultValues: {
      currency_id: 0,
      account: ''
    }
  });

  // Load data when modal opens
  useEffect(() => {
    if (open && locationId) {
      loadLocationCurrencies();
      loadAvailableCurrencies();
    }
  }, [open, locationId]);

  const loadLocationCurrencies = async () => {
    try {
      setLoading(true);
      const currencies = await locationService.getLocationCurrencies(locationId);
      setLocationCurrencies(currencies);
    } catch (err: any) {
      console.error('Failed to load location currencies:', err);
      setError('Failed to load location currencies');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableCurrencies = async () => {
    try {
      const currencies = await currencyService.getCurrencies();
      setAvailableCurrencies(currencies);
    } catch (err: any) {
      console.error('Failed to load currencies:', err);
      setError('Failed to load currencies');
    }
  };

  const handleAddCurrency = () => {
    setAddingNew(true);
    reset({
      currency_id: 0,
      account: ''
    });
    setError(null);
  };

  const handleCancelAdd = () => {
    setAddingNew(false);
    reset();
  };

  const onSubmitNew = async (data: LocationCurrencyCreate) => {
    try {
      setLoading(true);
      setError(null);

      await locationService.addLocationCurrency(locationId, {
        currency_id: data.currency_id,
        account: data.account.trim()
      });

      await loadLocationCurrencies();
      setAddingNew(false);
      reset();
    } catch (err: any) {
      console.error('Error adding currency:', err);
      setError(err.response?.data?.detail || 'Failed to add currency');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCurrency = (currency: LocationCurrency) => {
    setEditingCurrency({
      id: currency.id,
      account: currency.account
    });
  };

  const handleCancelEdit = () => {
    setEditingCurrency(null);
  };

  const handleSaveEdit = async () => {
    if (!editingCurrency) return;

    try {
      setLoading(true);
      setError(null);

      const currency = locationCurrencies.find(c => c.id === editingCurrency.id);
      if (!currency) return;

      await locationService.updateLocationCurrency(
        locationId,
        currency.currency_id,
        { account: editingCurrency.account.trim() }
      );

      await loadLocationCurrencies();
      setEditingCurrency(null);
    } catch (err: any) {
      console.error('Error updating currency:', err);
      setError(err.response?.data?.detail || 'Failed to update currency');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCurrency = async (currency: LocationCurrency) => {
    if (!window.confirm(`${t('common.confirmDelete')} ${currency.currency_code} (${currency.account})?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await locationService.removeLocationCurrency(locationId, currency.currency_id);
      await loadLocationCurrencies();
    } catch (err: any) {
      console.error('Error deleting currency:', err);
      setError(err.response?.data?.detail || 'Failed to delete currency');
    } finally {
      setLoading(false);
    }
  };

  const getUnusedCurrencies = () => {
    const usedCurrencyIds = locationCurrencies.map(lc => lc.currency_id);
    return availableCurrencies.filter(c => !usedCurrencyIds.includes(c.id!));
  };

  const handleClose = () => {
    if (!loading) {
      setEditingCurrency(null);
      setAddingNew(false);
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>
        {t('configuration.manageCurrencies')} - {locationName}
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="textSecondary">
            {t('configuration.locationCurrencyDescription')}
          </Typography>
        </Box>

        {/* Add new currency form */}
        {addingNew && (
          <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              {t('configuration.addCurrency')}
            </Typography>
            <form onSubmit={handleSubmit(onSubmitNew)}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth error={!!errors.currency_id}>
                    <InputLabel>{t('configuration.currency')}</InputLabel>
                    <Select
                      {...register('currency_id')}
                      value={watch('currency_id') || ''}
                      onChange={(e) => setValue('currency_id', e.target.value as number)}
                      disabled={loading}
                    >
                      {getUnusedCurrencies().map((currency) => (
                        <MenuItem key={currency.id} value={currency.id}>
                          {currency.code} - {currency.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.currency_id && (
                      <Typography variant="caption" color="error">
                        {errors.currency_id.message}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    {...register('account')}
                    label={t('configuration.account')}
                    fullWidth
                    error={!!errors.account}
                    helperText={errors.account?.message}
                    disabled={loading}
                    placeholder="LIM001-USD-ACC"
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      color="primary"
                      onClick={handleSubmit(onSubmitNew)}
                      disabled={loading}
                      size="small"
                    >
                      <SaveIcon />
                    </IconButton>
                    <IconButton
                      onClick={handleCancelAdd}
                      disabled={loading}
                      size="small"
                    >
                      <CancelIcon />
                    </IconButton>
                  </Box>
                </Grid>
              </Grid>
            </form>
          </Box>
        )}

        {/* Currency list */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            {t('configuration.associatedCurrencies')} ({locationCurrencies.length})
          </Typography>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={handleAddCurrency}
            disabled={loading || addingNew || getUnusedCurrencies().length === 0}
          >
            {t('configuration.addCurrency')}
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('configuration.currency')}</TableCell>
                <TableCell>{t('configuration.code')}</TableCell>
                <TableCell>{t('configuration.account')}</TableCell>
                <TableCell>{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {locationCurrencies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body2" color="textSecondary">
                      {t('configuration.noCurrenciesAssociated')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                locationCurrencies.map((currency) => (
                  <TableRow key={currency.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {currency.currency_name}
                        <Chip 
                          label={currency.currency_code} 
                          size="small" 
                          color="primary" 
                          variant="outlined" 
                        />
                      </Box>
                    </TableCell>
                    <TableCell>{currency.currency_code}</TableCell>
                    <TableCell>
                      {editingCurrency?.id === currency.id ? (
                        <TextField
                          value={editingCurrency.account}
                          onChange={(e) => setEditingCurrency({
                            ...editingCurrency,
                            account: e.target.value
                          })}
                          size="small"
                          disabled={loading}
                        />
                      ) : (
                        currency.account
                      )}
                    </TableCell>
                    <TableCell>
                      {editingCurrency?.id === currency.id ? (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={handleSaveEdit}
                            disabled={loading}
                          >
                            <SaveIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={handleCancelEdit}
                            disabled={loading}
                          >
                            <CancelIcon />
                          </IconButton>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEditCurrency(currency)}
                            disabled={loading || editingCurrency !== null || addingNew}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteCurrency(currency)}
                            disabled={loading || editingCurrency !== null || addingNew}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {getUnusedCurrencies().length === 0 && !addingNew && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {t('configuration.allCurrenciesAssociated')}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleClose}
          disabled={loading}
        >
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LocationCurrencyModal;

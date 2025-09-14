import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { categoryAlertService, CategoryCountryAlert, CategoryCountryAlertCreate } from '../../services/categoryAlertService';
import { countryService } from '../../services/countryService';
import { currencyService } from '../../services/currencyService';

interface CategoryAlertsModalProps {
  open: boolean;
  onClose: () => void;
  categoryId: number;
  categoryName: string;
}

interface Country {
  id: number;
  name: string;
}

interface Currency {
  id: number;
  name: string;
  code: string;
  symbol?: string;
}

const CategoryAlertsModal: React.FC<CategoryAlertsModalProps> = ({
  open,
  onClose,
  categoryId,
  categoryName
}) => {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<CategoryCountryAlert[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingAlert, setEditingAlert] = useState<number | null>(null);
  const [newAlert, setNewAlert] = useState<{
    country_id: number;
    currency_id: number;
    alert_amount: string;
    alert_message?: string;
  } | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, categoryId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [alertsData, countriesData, currenciesData] = await Promise.all([
        categoryAlertService.getAlerts({ category_id: categoryId }),
        countryService.getCountries(),
        currencyService.getCurrencies()
      ]);
      
      setAlerts(alertsData);
      setCountries(countriesData);
      setCurrencies(currenciesData);
      setError('');
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setNewAlert({
      country_id: 0,
      currency_id: 0,
      alert_amount: '',
      alert_message: ''
    });
  };

  const handleSaveNew = async () => {
    if (!newAlert || !newAlert.country_id || !newAlert.currency_id || !newAlert.alert_amount) {
      setError('Please fill all fields');
      return;
    }

    try {
      const alertData: CategoryCountryAlertCreate = {
        category_id: categoryId,
        country_id: newAlert.country_id,
        currency_id: newAlert.currency_id,
        alert_amount: parseFloat(newAlert.alert_amount),
        alert_message: newAlert.alert_message?.trim() ? newAlert.alert_message : undefined
      };

      await categoryAlertService.createAlert(alertData);
      setNewAlert(null);
      loadData();
      setError('');
    } catch (error: any) {
      console.error('Error creating alert:', error);
      setError(error.response?.data?.detail || 'Failed to create alert');
    }
  };

  const handleCancelNew = () => {
    setNewAlert(null);
    setError('');
  };

  const handleEdit = (alertId: number) => {
    setEditingAlert(alertId);
  };

  const handleSaveEdit = async (alertId: number, newAmount: string, newMessage?: string) => {
    try {
      await categoryAlertService.updateAlert(alertId, {
        alert_amount: parseFloat(newAmount),
        alert_message: newMessage
      });
      setEditingAlert(null);
      loadData();
      setError('');
    } catch (error) {
      console.error('Error updating alert:', error);
      setError('Failed to update alert');
    }
  };

  const handleCancelEdit = () => {
    setEditingAlert(null);
  };

  const handleDelete = async (alertId: number) => {
    if (window.confirm(t('common.confirmDelete'))) {
      try {
        await categoryAlertService.deleteAlert(alertId);
        loadData();
        setError('');
      } catch (error) {
        console.error('Error deleting alert:', error);
        setError('Failed to delete alert');
      }
    }
  };

  const getCountryName = (countryId: number) => {
    return countries.find(c => c.id === countryId)?.name || '';
  };

  const getCurrencyDisplay = (currencyId: number) => {
    const currency = currencies.find(c => c.id === currencyId);
    return currency ? `${currency.code} (${currency.name})` : '';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {t('configuration.setAlerts')} - {categoryName}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                {t('configuration.alertsByCountryAndCurrency')}
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddNew}
                disabled={!!newAlert}
              >
                {t('configuration.addAlert')}
              </Button>
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('configuration.country')}</TableCell>
                    <TableCell>{t('configuration.currency')}</TableCell>
                    <TableCell>{t('configuration.alertAmount')}</TableCell>
                    <TableCell>{t('configuration.alertMessage')}</TableCell>
                    <TableCell>{t('common.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* New Alert Row */}
                  {newAlert && (
                    <TableRow>
                      <TableCell>
                        <FormControl fullWidth size="small">
                          <InputLabel>{t('configuration.country')}</InputLabel>
                          <Select
                            value={newAlert.country_id}
                            onChange={(e) => setNewAlert({
                              ...newAlert,
                              country_id: Number(e.target.value)
                            })}
                          >
                            {countries.map(country => (
                              <MenuItem key={country.id} value={country.id}>
                                {country.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <FormControl fullWidth size="small">
                          <InputLabel>{t('configuration.currency')}</InputLabel>
                          <Select
                            value={newAlert.currency_id}
                            onChange={(e) => setNewAlert({
                              ...newAlert,
                              currency_id: Number(e.target.value)
                            })}
                          >
                            {currencies.map(currency => (
                              <MenuItem key={currency.id} value={currency.id}>
                                {currency.code} ({currency.name})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={newAlert.alert_amount}
                          onChange={(e) => setNewAlert({
                            ...newAlert,
                            alert_amount: e.target.value
                          })}
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={newAlert.alert_message || ''}
                          onChange={(e) => setNewAlert({
                            ...newAlert,
                            alert_message: e.target.value
                          })}
                          placeholder={t('configuration.alertMessageHelp')}
                          inputProps={{ maxLength: 300 }}
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={handleSaveNew}
                        >
                          <SaveIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={handleCancelNew}
                        >
                          <CancelIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Existing Alerts */}
                  {alerts.map((alert) => (
                    <AlertRow
                      key={alert.id}
                      alert={alert}
                      isEditing={editingAlert === alert.id}
                      onEdit={() => handleEdit(alert.id)}
                      onSave={handleSaveEdit}
                      onCancel={handleCancelEdit}
                      onDelete={() => handleDelete(alert.id)}
                      getCountryName={getCountryName}
                      getCurrencyDisplay={getCurrencyDisplay}
                    />
                  ))}

                  {alerts.length === 0 && !newAlert && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography color="textSecondary">
                          {t('configuration.noAlertsConfigured')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface AlertRowProps {
  alert: CategoryCountryAlert;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (alertId: number, newAmount: string, newMessage?: string) => void;
  onCancel: () => void;
  onDelete: () => void;
  getCountryName: (countryId: number) => string;
  getCurrencyDisplay: (currencyId: number) => string;
}

const AlertRow: React.FC<AlertRowProps> = ({
  alert,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  getCountryName,
  getCurrencyDisplay
}) => {
  const [editAmount, setEditAmount] = useState(alert.alert_amount.toString());
  const [editMessage, setEditMessage] = useState(alert.alert_message || '');

  useEffect(() => {
    if (isEditing) {
      setEditAmount(alert.alert_amount.toString());
      setEditMessage(alert.alert_message || '');
    }
  }, [isEditing, alert.alert_amount]);

  return (
    <TableRow>
      <TableCell>{getCountryName(alert.country_id)}</TableCell>
      <TableCell>{getCurrencyDisplay(alert.currency_id)}</TableCell>
      <TableCell>
        {isEditing ? (
          <TextField
            size="small"
            type="number"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
          />
        ) : (
          alert.alert_amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <TextField
            size="small"
            value={editMessage}
            onChange={(e) => setEditMessage(e.target.value)}
            inputProps={{ maxLength: 300 }}
            fullWidth
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            {alert.alert_message || '-'}
          </Typography>
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <>
            <IconButton
              size="small"
              color="primary"
              onClick={() => onSave(alert.id, editAmount, editMessage.trim() || undefined)}
            >
              <SaveIcon />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={onCancel}
            >
              <CancelIcon />
            </IconButton>
          </>
        ) : (
          <>
            <IconButton
              size="small"
              color="primary"
              onClick={onEdit}
            >
              <EditIcon />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={onDelete}
            >
              <DeleteIcon />
            </IconButton>
          </>
        )}
      </TableCell>
    </TableRow>
  );
};

export default CategoryAlertsModal;

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  AccountBalance as AccountBalanceIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import creditCardService, { 
  UserCurrencyCombination, 
  PrepaymentFormData 
} from '../../services/creditCardService';
import { countryService, Country } from '../../services/countryService';

interface CreditCardPrepaymentFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  statementId: number;
  userCurrencyCombinations: UserCurrencyCombination[];
}

const CreditCardPrepaymentFormModal: React.FC<CreditCardPrepaymentFormModalProps> = ({
  open,
  onClose,
  onSuccess,
  statementId,
  userCurrencyCombinations,
}) => {
  const { t } = useTranslation();
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, PrepaymentFormData>>({});

  useEffect(() => {
    if (open) {
      loadCountries();
      initializeFormData();
    }
  }, [open, userCurrencyCombinations]);

  const loadCountries = async () => {
    try {
      setLoading(true);
      const countriesData = await countryService.getCountries();
      setCountries(countriesData);
    } catch (error) {
      console.error('Failed to load countries:', error);
      setError('Failed to load countries');
    } finally {
      setLoading(false);
    }
  };

  const initializeFormData = () => {
    const initialData: Record<string, PrepaymentFormData> = {};
    
    userCurrencyCombinations.forEach((combo) => {
      const key = `${combo.user_id}_${combo.currency_code}`;
      
      // Calculate min/max dates from consolidated expenses for this combination
      const userExpenses = combo.consolidated_expenses || [];
      let minDate = '';
      let maxDate = '';
      
      if (userExpenses.length > 0) {
        const dates = userExpenses.map(exp => new Date(exp.expense_date));
        const minDateObj = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDateObj = new Date(Math.max(...dates.map(d => d.getTime())));
        
        minDate = minDateObj.toISOString().split('T')[0];
        maxDate = maxDateObj.toISOString().split('T')[0];
      }
      
      initialData[key] = {
        user_id: combo.user_id,
        currency_code: combo.currency_code,
        reason: '',
        country_id: 0,
        start_date: minDate,
        end_date: maxDate,
        comment: '',
      };
    });
    
    setFormData(initialData);
  };

  const updateFormData = (key: string, field: keyof PrepaymentFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const validateForm = (): boolean => {
    for (const combo of userCurrencyCombinations) {
      const key = `${combo.user_id}_${combo.currency_code}`;
      const data = formData[key];
      
      if (!data?.reason?.trim() || 
          !data?.country_id || 
          !data?.start_date || 
          !data?.end_date) {
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setError('Please fill in all required fields for all prepayments');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const prepaymentDataArray = Object.values(formData);
      await creditCardService.processStatement(statementId, prepaymentDataArray);
      onSuccess();
    } catch (error: any) {
      console.error('Failed to create prepayments:', error);
      setError(error?.response?.data?.detail || 'Failed to create prepayments');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setFormData({});
    setError('');
    onClose();
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountBalanceIcon />
            {t('reports.createPrepaymentsFromStatement')}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" gutterBottom>
              {t('reports.completePrepaymentInfo')}
            </Typography>

            {loading && <LinearProgress sx={{ mb: 2 }} />}

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('reports.user')}</TableCell>
                    <TableCell>{t('reports.currency')}</TableCell>
                    <TableCell>{t('reports.amount')}</TableCell>
                    <TableCell>{t('reports.transactions')}</TableCell>
                    <TableCell width="200">{t('prepayments.reason')} *</TableCell>
                    <TableCell width="150">{t('common.country')} *</TableCell>
                    <TableCell width="150">{t('prepayments.startDate')} *</TableCell>
                    <TableCell width="150">{t('prepayments.endDate')} *</TableCell>
                    <TableCell width="200">{t('prepayments.comments')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {userCurrencyCombinations.map((combo) => {
                    const key = `${combo.user_id}_${combo.currency_code}`;
                    const data = formData[key] || {};
                    
                    return (
                      <TableRow key={key}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {combo.user_name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {combo.credit_card_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={combo.currency_code} size="small" />
                          <Typography variant="caption" display="block">
                            {combo.currency_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {combo.total_amount} {combo.currency_code}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {combo.transaction_count}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            fullWidth
                            placeholder="Propósito del viaje"
                            value={data.reason || ''}
                            onChange={(e) => updateFormData(key, 'reason', e.target.value)}
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <FormControl size="small" fullWidth required>
                            <InputLabel>País</InputLabel>
                            <Select
                              value={data.country_id || ''}
                              onChange={(e) => updateFormData(key, 'country_id', e.target.value)}
                              label="País"
                            >
                              {countries.map((country) => (
                                <MenuItem key={country.id} value={country.id}>
                                  {country.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <DatePicker
                            value={data.start_date ? new Date(data.start_date) : null}
                            onChange={(date) => updateFormData(key, 'start_date', date?.toISOString().split('T')[0] || '')}
                            slotProps={{
                              textField: {
                                size: 'small',
                                fullWidth: true,
                                required: true,
                              },
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <DatePicker
                            value={data.end_date ? new Date(data.end_date) : null}
                            onChange={(date) => updateFormData(key, 'end_date', date?.toISOString().split('T')[0] || '')}
                            slotProps={{
                              textField: {
                                size: 'small',
                                fullWidth: true,
                                required: true,
                              },
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            fullWidth
                            placeholder="Comentarios adicionales"
                            value={data.comment || ''}
                            onChange={(e) => updateFormData(key, 'comment', e.target.value)}
                            multiline
                            rows={2}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {processing && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Creating prepayments...
                </Typography>
                <LinearProgress />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!validateForm() || processing || loading}
            variant="contained"
            startIcon={<SaveIcon />}
          >
            {processing ? 'Creando...' : 'Crear Anticipos'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default CreditCardPrepaymentFormModal;

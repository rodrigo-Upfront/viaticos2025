import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
// no SelectChangeEvent needed when using TextField with select
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import PrepaymentModal from '../components/forms/PrepaymentModal';
import PrepaymentViewModal from '../components/modals/PrepaymentViewModal';
import ConfirmDialog from '../components/forms/ConfirmDialog';
import apiClient from '../services/apiClient';
import { prepaymentService, Prepayment as ApiPrepayment } from '../services/prepaymentService';
import { currencyService, Currency } from '../services/currencyService';
import { countryService, Country as ApiCountry } from '../services/countryService';
// report creation from prepayments removed per requirements

interface Prepayment {
  id?: number;
  reason: string;
  destination_country_id: number;
  destination: string;
  startDate: string;
  endDate: string;
  amount: number;
  currency: string;
  currency_id?: number;
  comment: string;
  justification_file?: string;
  status: string;
  rejection_reason?: string;
}

interface Country {
  id: number;
  name: string;
}

const PrepaymentsPage: React.FC = () => {
  const { t, i18n } = useTranslation();

  // Loading states
  const [loading, setLoading] = useState({
    prepayments: true,
    countries: true,
    action: false,
  });

  // Data state
  const [countries, setCountries] = useState<Country[]>([]);
  const [prepayments, setPrepayments] = useState<Prepayment[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  const [modal, setModal] = useState({
    open: false,
    mode: 'create' as 'create' | 'edit',
    prepayment: undefined as Prepayment | undefined
  });

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: undefined as string | undefined,
    cancelText: undefined as string | undefined,
    severity: undefined as 'error' | 'warning' | 'info' | undefined,
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  const [viewModal, setViewModal] = useState({
    open: false,
    prepayment: undefined as Prepayment | undefined
  });

  // Filters/search state
  const [searchText, setSearchText] = useState('');
  const [filterCountryId, setFilterCountryId] = useState<number | ''>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Load data on component mount
  useEffect(() => {
    loadPrepayments();
    loadCountries();
    loadCurrencies();
  }, []);

  // Helper function to convert API prepayment to frontend format
  const mapApiToFrontend = (apiPrepayment: ApiPrepayment): Prepayment => {
    return {
      id: apiPrepayment.id,
      reason: apiPrepayment.reason,
      destination_country_id: apiPrepayment.destination_country_id,
      destination: apiPrepayment.destination_country_name || 'Unknown',
      startDate: apiPrepayment.start_date,
      endDate: apiPrepayment.end_date,
      amount: parseFloat(apiPrepayment.amount),
      currency: apiPrepayment.currency_code || '',
      currency_id: (apiPrepayment as any).currency_id,
      comment: apiPrepayment.comment || '',
      justification_file: apiPrepayment.justification_file,
      status: apiPrepayment.status,
      rejection_reason: (apiPrepayment as any).rejection_reason,
    };
  };

  // Helper function to convert frontend prepayment to API format
  const mapFrontendToApi = (frontendPrepayment: Prepayment) => {
    const currencyId = currencies.find(c => c.code === frontendPrepayment.currency)?.id || frontendPrepayment.currency_id;
    return {
      reason: frontendPrepayment.reason,
      destination_country_id: frontendPrepayment.destination_country_id,
      start_date: frontendPrepayment.startDate,
      end_date: frontendPrepayment.endDate,
      amount: frontendPrepayment.amount,
      currency_id: currencyId as number,
      comment: frontendPrepayment.comment,
      justification_file: frontendPrepayment.justification_file,
    };
  };

  // Load prepayments from API
  const loadPrepayments = async () => {
    try {
      setLoading(prev => ({ ...prev, prepayments: true }));
      const response = await prepaymentService.getPrepayments({
        search: searchText || undefined,
        status_filter: filterStatus || undefined,
        // country filter supported in backend using country_id
        ...(filterCountryId ? { country_id: filterCountryId as number } : {} as any),
      } as any);
      const mappedPrepayments = response.prepayments.map(mapApiToFrontend);
      setPrepayments(mappedPrepayments);
    } catch (error) {
      console.error('Failed to load prepayments:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load prepayments',
        severity: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, prepayments: false }));
    }
  };

  // Load countries from API
  const loadCountries = async () => {
    try {
      setLoading(prev => ({ ...prev, countries: true }));
      const response = await countryService.getCountries();
      const mappedCountries = response.map((country: ApiCountry) => ({
        id: country.id,
        name: country.name,
        // currency removed from Country
      }));
      setCountries(mappedCountries);
    } catch (error) {
      console.error('Failed to load countries:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load countries',
        severity: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, countries: false }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'supervisor_pending':
      case 'accounting_pending':
      case 'treasury_pending':
        return 'info';
      default:
        return 'default';
    }
  };

  const PREPAYMENT_STATUS_LABELS: Record<string, { en: string; es: string }> = {
    pending: { en: 'Pending', es: 'Pendiente' },
    supervisor_pending: { en: 'Supervisor Pending', es: 'Pend. Jefatura' },
    accounting_pending: { en: 'Accounting Pending', es: 'Pend. Contabilidad' },
    treasury_pending: { en: 'Treasury Pending', es: 'Pend. Tesorería' },
    approved_for_reimbursement: { en: 'Approved for Reimbursement', es: 'Aprobado para Reembolso' },
    funds_return_pending: { en: 'Funds Return Pending', es: 'Devolución Pendiente' },
    approved: { en: 'Approved', es: 'Aprobado' },
    rejected: { en: 'Rejected', es: 'Rechazado' },
  };

  const getStatusLabel = (status: string) => {
    const lang = i18n.language?.startsWith('es') ? 'es' : 'en';
    const entry = PREPAYMENT_STATUS_LABELS[status.toLowerCase()];
    return entry ? entry[lang] : status;
  };

  // CRUD operations
  const handleCreate = async () => {
    await Promise.all([loadCountries(), loadCurrencies()]);
    setModal({ open: true, mode: 'create', prepayment: undefined });
  };

  const handleEdit = async (prepayment: Prepayment) => {
    await Promise.all([loadCountries(), loadCurrencies()]);
    setModal({ open: true, mode: 'edit', prepayment });
  };

  const handleView = (prepayment: Prepayment) => {
    setViewModal({ open: true, prepayment });
  };

  const loadCurrencies = async () => {
    try {
      const data = await currencyService.getCurrencies();
      setCurrencies(data);
    } catch (error) {
      console.error('Failed to load currencies:', error);
    }
  };

  const canMutate = (status: string) => ['pending', 'rejected'].includes(status.toLowerCase());



  // removed create report action

  const handleDelete = (prepayment: Prepayment) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Prepayment',
      message: `Are you sure you want to delete the prepayment for "${prepayment.reason}"? This action cannot be undone.`,
      onConfirm: async () => {
        if (!prepayment.id) return;
        
        try {
          setLoading(prev => ({ ...prev, action: true }));
          await prepaymentService.deletePrepayment(prepayment.id);
          setPrepayments(prev => prev.filter(p => p.id !== prepayment.id));
          setSnackbar({
            open: true,
            message: 'Prepayment deleted successfully',
            severity: 'success'
          });
        } catch (error) {
          console.error('Failed to delete prepayment:', error);
          setSnackbar({
            open: true,
            message: 'Failed to delete prepayment',
            severity: 'error'
          });
        } finally {
          setLoading(prev => ({ ...prev, action: false }));
        }
      },
      confirmText: 'Delete',
      cancelText: 'Cancel',
      severity: 'error'
    });
  };

  const handleSave = async (prepaymentData: Prepayment) => {
    try {
      setLoading(prev => ({ ...prev, action: true }));
      
      if (modal.mode === 'create') {
        const apiData = mapFrontendToApi(prepaymentData);
        const newPrepayment = await prepaymentService.createPrepayment(apiData);
        const mappedPrepayment = mapApiToFrontend(newPrepayment);
        setPrepayments(prev => [...prev, mappedPrepayment]);
        setSnackbar({
          open: true,
          message: 'Prepayment created successfully',
          severity: 'success'
        });
      } else if (prepaymentData.id) {
        const apiData = mapFrontendToApi(prepaymentData);
        const updatedPrepayment = await prepaymentService.updatePrepayment(prepaymentData.id, apiData);
        const mappedPrepayment = mapApiToFrontend(updatedPrepayment);
        setPrepayments(prev => prev.map(p => p.id === prepaymentData.id ? mappedPrepayment : p));
        setSnackbar({
          open: true,
          message: 'Prepayment updated successfully',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Failed to save prepayment:', error);
      setSnackbar({
        open: true,
        message: `Failed to ${modal.mode === 'create' ? 'create' : 'update'} prepayment`,
        severity: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  };

  const handleSendForApproval = (prepayment: Prepayment) => {
    if (prepayment.status.toLowerCase() !== 'pending') {
      setSnackbar({
        open: true,
        message: 'Only pending prepayments can be sent for approval',
        severity: 'warning'
      });
      return;
    }

    setConfirmDialog({
      open: true,
      title: 'Send for Approval',
      message: `This will send the prepayment "${prepayment.reason}" for approval. Continue?`,
      onConfirm: async () => {
        try {
          setLoading(prev => ({ ...prev, action: true }));
          await apiClient.post(`/approvals/prepayments/${prepayment.id}/submit`, {});
          // Refresh list or update item status locally
          setPrepayments(prev => prev.map(p => p.id === prepayment.id ? { ...p, status: 'supervisor_pending' } : p));
          setSnackbar({ open: true, message: 'Sent for approval', severity: 'success' });
        } catch (error: any) {
          console.error('Failed to submit for approval:', error);
          setSnackbar({ open: true, message: 'Failed to send for approval', severity: 'error' });
        } finally {
          setLoading(prev => ({ ...prev, action: false }));
        }
      },
      confirmText: 'Send',
      cancelText: 'Cancel',
      severity: 'info'
    });
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          {t('navigation.prepayments')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          {t('common.create')} Prepayment
        </Button>
      </Box>

      {/* Search and filters */}
      <Box display="flex" gap={2} alignItems="center" mb={2}>
        <TextField
          size="small"
          placeholder="Search reason..."
          value={searchText}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon fontSize="small" /> as any }}
          sx={{ minWidth: 240 }}
        />
        <TextField
          select
          size="small"
          label="Country"
          value={filterCountryId}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterCountryId(e.target.value === '' ? '' : Number(e.target.value))}
          sx={{ minWidth: 200 }}
          SelectProps={{ native: true }}
        >
          <option value=""></option>
          {countries.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Status"
          value={filterStatus}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterStatus(e.target.value)}
          sx={{ minWidth: 220 }}
          SelectProps={{ native: true }}
        >
          <option value=""></option>
          {Object.keys(PREPAYMENT_STATUS_LABELS).map(code => (
            <option key={code} value={code}>{getStatusLabel(code)}</option>
          ))}
        </TextField>
        <Button variant="outlined" onClick={loadPrepayments}>Apply</Button>
        <Button variant="text" onClick={() => { setSearchText(''); setFilterCountryId(''); setFilterStatus(''); loadPrepayments(); }}>Reset</Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Destination</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading.prepayments ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Loading prepayments...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : prepayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No prepayments found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              prepayments.map((prepayment) => (
              <TableRow key={prepayment.id}>
                <TableCell>{prepayment.id}</TableCell>
                <TableCell>{prepayment.reason}</TableCell>
                <TableCell>{prepayment.destination}</TableCell>
                <TableCell>{prepayment.startDate}</TableCell>
                <TableCell>{prepayment.endDate}</TableCell>
                <TableCell>{prepayment.currency} {prepayment.amount.toLocaleString()}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(prepayment.status)}
                    color={getStatusColor(prepayment.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleView(prepayment)}
                    color="info"
                  >
                    <ViewIcon />
                  </IconButton>
                  {/* no create report action here */}
                  {canMutate(prepayment.status) && (
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(prepayment)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                  )}
                  {prepayment.status.toLowerCase() === 'pending' && (
                    <IconButton
                      size="small"
                      onClick={() => handleSendForApproval(prepayment)}
                      color="success"
                      title="Send for Approval"
                    >
                      <SendIcon />
                    </IconButton>
                  )}
                  {canMutate(prepayment.status) && (
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(prepayment)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Prepayment Modal */}
      <PrepaymentModal
        open={modal.open}
        onClose={() => setModal({ open: false, mode: 'create', prepayment: undefined })}
        onSave={handleSave}
        prepayment={modal.prepayment}
        mode={modal.mode}
        countries={countries}
        currencies={currencies}
        loading={loading.action}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        severity={confirmDialog.severity || 'warning'}
        confirmText={confirmDialog.confirmText || 'Confirm'}
        cancelText={confirmDialog.cancelText || 'Cancel'}
      />

      {/* Prepayment View Modal */}
      <PrepaymentViewModal
        open={viewModal.open}
        onClose={() => setViewModal({ open: false, prepayment: undefined })}
        prepayment={viewModal.prepayment}
      />

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PrepaymentsPage;

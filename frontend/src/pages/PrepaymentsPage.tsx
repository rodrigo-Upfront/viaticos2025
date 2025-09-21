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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
import { useAuth } from '../contexts/AuthContext';
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
  amount: string | number;
  currency: string;
  currency_id?: number;
  comment: string;
  justification_files?: Array<{filename: string, original_name: string, file_path: string}>;
  status: string;
  rejection_reason?: string;
  created_at?: string;
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
  
  // Dynamic filter options based on user's data
  const [filterOptions, setFilterOptions] = useState<{
    statuses: string[];
    countries: Array<{id: number; name: string}>;
    currencies: Array<{id: number; code: string; name: string}>;
  }>({
    statuses: [],
    countries: [],
    currencies: []
  });

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

  // Filters/search state - unified object for real-time filtering
  const { user } = useAuth();
  const [searchFilters, setSearchFilters] = useState({
    reason: '',
    countryId: '' as string | number,
    status: '',
    userId: user?.id || '' as number | ''
  });
  
  const [availableUsers, setAvailableUsers] = useState<{id: number, name: string, email: string, profile: string}[]>([]);
  const [filteredPrepayments, setFilteredPrepayments] = useState<Prepayment[]>([]);
  
  // Check if user can filter by other users
  const canFilterByUser = user?.profile === 'ACCOUNTING' || user?.profile === 'TREASURY' || user?.is_superuser;

  // Load data on component mount
  useEffect(() => {
    loadPrepayments();
    loadCountries();
    loadCurrencies();
    loadFilterOptions();
    if (canFilterByUser) {
      loadAvailableUsers();
    }
  }, [canFilterByUser]);

  // Real-time filtering effect
  useEffect(() => {
    let filtered = prepayments;

    if (searchFilters.reason) {
      filtered = filtered.filter(prepayment => 
        prepayment.reason.toLowerCase().includes(searchFilters.reason.toLowerCase())
      );
    }

    if (searchFilters.countryId) {
      filtered = filtered.filter(prepayment => 
        prepayment.destination_country_id === Number(searchFilters.countryId)
      );
    }

    if (searchFilters.status) {
      filtered = filtered.filter(prepayment => 
        prepayment.status.toLowerCase() === searchFilters.status.toLowerCase()
      );
    }

    if (searchFilters.userId && canFilterByUser) {
      // Note: This will be handled by backend API call, but we keep the filter state for UI consistency
      // The actual filtering by userId happens in loadPrepayments()
    }

    // Sort by creation date descending (newest first)
    const sortedFiltered = filtered.sort((a, b) => {
      if (!a.created_at || !b.created_at) return 0;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    setFilteredPrepayments(sortedFiltered);
  }, [prepayments, searchFilters, canFilterByUser]);

  // Reload prepayments when userId filter changes (for backend filtering)
  useEffect(() => {
    if (canFilterByUser) {
      loadPrepayments();
    }
  }, [searchFilters.userId, canFilterByUser]);

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
      justification_files: apiPrepayment.justification_files,
      status: apiPrepayment.status,
      rejection_reason: (apiPrepayment as any).rejection_reason,
      created_at: apiPrepayment.created_at,
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
      amount: typeof frontendPrepayment.amount === 'string' ? parseFloat(frontendPrepayment.amount) || 0 : frontendPrepayment.amount,
      currency_id: currencyId as number,
      comment: frontendPrepayment.comment,
      justification_files: frontendPrepayment.justification_files,
    };
  };

  // Load prepayments from API
  const loadPrepayments = async () => {
    try {
      setLoading(prev => ({ ...prev, prepayments: true }));
      const response = await prepaymentService.getPrepayments({
        // Only pass user_id filter to backend if user has permission to filter by user
        ...(canFilterByUser && searchFilters.userId ? { user_id: searchFilters.userId as number } : {} as any),
      } as any);
      const mappedPrepayments = response.prepayments.map(mapApiToFrontend);
      // Sort by creation date descending (newest first)
      const sortedPrepayments = mappedPrepayments.sort((a, b) => {
        if (!a.created_at || !b.created_at) return 0;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setPrepayments(sortedPrepayments);
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

  const loadFilterOptions = async () => {
    try {
      const options = await prepaymentService.getFilterOptions();
      setFilterOptions(options);
    } catch (error) {
      console.error('Failed to load filter options:', error);
      // Fallback to all countries if dynamic loading fails
      setFilterOptions(prev => ({
        ...prev,
        countries: countries.map(c => ({id: c.id, name: c.name}))
      }));
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const users = await prepaymentService.getUsersForFilter();
      setAvailableUsers(users);
    } catch (error) {
      console.error('Failed to load available users:', error);
      // If user doesn't have permission, this will fail silently
    }
  };

  const canMutate = (status: string) => ['pending', 'rejected'].includes(status.toLowerCase());
  const canDelete = (status: string) => status.toLowerCase() === 'pending';



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

  const uploadFile = async (prepaymentId: number, file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);

    await apiClient.post(`/prepayments/${prepaymentId}/upload-file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  };

  const handleSave = async (prepaymentData: Prepayment, files?: File[]) => {
    try {
      setLoading(prev => ({ ...prev, action: true }));
      
      let savedPrepayment: any;
      
      if (modal.mode === 'create') {
        const apiData = mapFrontendToApi(prepaymentData);
        savedPrepayment = await prepaymentService.createPrepayment(apiData);
        
        // Upload files if provided
        if (files && files.length > 0 && savedPrepayment.id) {
          await prepaymentService.uploadMultipleFiles(savedPrepayment.id, files);
          // Refetch the prepayment to get updated file info
          savedPrepayment = await prepaymentService.getPrepayment(savedPrepayment.id);
        }
        
        const mappedPrepayment = mapApiToFrontend(savedPrepayment);
        setPrepayments(prev => [...prev, mappedPrepayment]);
        setSnackbar({
          open: true,
          message: 'Prepayment created successfully',
          severity: 'success'
        });
      } else if (prepaymentData.id) {
        const apiData = mapFrontendToApi(prepaymentData);
        savedPrepayment = await prepaymentService.updatePrepayment(prepaymentData.id, apiData);
        
        // Upload files if provided
        if (files && files.length > 0) {
          await prepaymentService.uploadMultipleFiles(prepaymentData.id, files);
          // Refetch the prepayment to get updated file info
          savedPrepayment = await prepaymentService.getPrepayment(prepaymentData.id);
        }
        
        const mappedPrepayment = mapApiToFrontend(savedPrepayment);
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
      throw error; // Re-throw to let modal handle it
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  };

  const handleSendForApproval = (prepayment: Prepayment) => {
    if (!['pending', 'rejected'].includes(prepayment.status.toLowerCase())) {
      setSnackbar({
        open: true,
        message: t('prepaymentModule.onlyPendingRejectedCanApprove'),
        severity: 'warning'
      });
      return;
    }

    const isRejected = prepayment.status.toLowerCase() === 'rejected';
    setConfirmDialog({
      open: true,
      title: isRejected ? t('prepaymentModule.resubmitForApprovalTitle') : t('prepaymentModule.sendForApprovalTitle'),
      message: isRejected 
        ? t('prepaymentModule.resubmitForApprovalMessage').replace('{reason}', prepayment.reason)
        : t('prepaymentModule.sendForApprovalMessage').replace('{reason}', prepayment.reason),
      onConfirm: async () => {
        try {
          setLoading(prev => ({ ...prev, action: true }));
          await apiClient.post(`/approvals/prepayments/${prepayment.id}/submit`, {});
          // Refresh list or update item status locally
          setPrepayments(prev => prev.map(p => p.id === prepayment.id ? { ...p, status: 'supervisor_pending' } : p));
          setSnackbar({ 
            open: true, 
            message: isRejected ? t('prepaymentModule.resubmittedForApproval') : t('prepaymentModule.sentForApproval'), 
            severity: 'success' 
          });
        } catch (error: any) {
          console.error('Failed to submit for approval:', error);
          setSnackbar({ open: true, message: 'Failed to send for approval', severity: 'error' });
        } finally {
          setLoading(prev => ({ ...prev, action: false }));
        }
      },
      confirmText: isRejected ? t('prepaymentModule.resubmitButton') : t('prepaymentModule.sendButton'),
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
          {t('prepaymentModule.createPrepayment')}
        </Button>
      </Box>

      {/* Search and filters */}
      <Box display="flex" gap={2} alignItems="center" mb={2}>
        <TextField
          size="small"
          placeholder={t('prepaymentModule.searchReason')}
          value={searchFilters.reason}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
            setSearchFilters(prev => ({ ...prev, reason: e.target.value }))
          }
          InputProps={{ startAdornment: <SearchIcon fontSize="small" /> as any }}
          sx={{ minWidth: 240 }}
        />
        
        {/* User filter - only for accounting/treasury users */}
        {canFilterByUser && (
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>{t('common.user')}</InputLabel>
            <Select
              value={searchFilters.userId}
              label={t('common.user')}
              onChange={(e) => 
                setSearchFilters(prev => ({ ...prev, userId: e.target.value as number | '' }))
              }
            >
              <MenuItem value={user?.id}>{t('common.myRecords')}</MenuItem>
              {availableUsers.map(u => (
                <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        
        <TextField
          select
          size="small"
          label={t('common.country')}
          value={searchFilters.countryId}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
            setSearchFilters(prev => ({ ...prev, countryId: e.target.value === '' ? '' : Number(e.target.value) }))
          }
          sx={{ minWidth: 200 }}
          SelectProps={{ native: true }}
        >
          <option value=""></option>
          {filterOptions.countries.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t('common.status')}
          value={searchFilters.status}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
            setSearchFilters(prev => ({ ...prev, status: e.target.value }))
          }
          sx={{ minWidth: 220 }}
          SelectProps={{ native: true }}
        >
          <option value=""></option>
          {filterOptions.statuses.map(status => (
            <option key={status} value={status}>{getStatusLabel(status)}</option>
          ))}
        </TextField>
        <Button 
          variant="text" 
          onClick={() => 
            setSearchFilters({ 
              reason: '', 
              countryId: '', 
              status: '', 
              userId: user?.id || '' 
            })
          }
        >
          {t('expenses.reset')}
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('tables.id')}</TableCell>
              <TableCell>{t('prepayments.reason')}</TableCell>
              <TableCell>{t('prepaymentModule.destination')}</TableCell>
              <TableCell>{t('prepaymentModule.startDate')}</TableCell>
              <TableCell>{t('prepaymentModule.endDate')}</TableCell>
              <TableCell>{t('common.amount')}</TableCell>
              <TableCell>{t('common.status')}</TableCell>
              <TableCell>{t('common.actions')}</TableCell>
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
            ) : filteredPrepayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No prepayments found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredPrepayments.map((prepayment) => (
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
                  {(prepayment.status.toLowerCase() === 'pending' || prepayment.status.toLowerCase() === 'rejected') && (
                    <IconButton
                      size="small"
                      onClick={() => handleSendForApproval(prepayment)}
                      color="success"
                      title={prepayment.status.toLowerCase() === 'rejected' ? t('prepaymentModule.resubmitForApproval') : t('prepaymentModule.sendForApproval')}
                    >
                      <SendIcon />
                    </IconButton>
                  )}
                  {canDelete(prepayment.status) && (
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

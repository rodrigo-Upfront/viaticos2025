import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
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
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import PrepaymentModal from '../components/forms/PrepaymentModal';
import PrepaymentViewModal from '../components/modals/PrepaymentViewModal';
import ConfirmDialog from '../components/forms/ConfirmDialog';
import { prepaymentService, Prepayment as ApiPrepayment } from '../services/prepaymentService';
import { countryService, Country as ApiCountry } from '../services/countryService';

interface Prepayment {
  id?: number;
  reason: string;
  destination_country_id: number;
  destination: string;
  startDate: string;
  endDate: string;
  amount: number;
  currency: string;
  comment: string;
  justification_file?: string;
  status: string;
}

interface Country {
  id: number;
  name: string;
  currency: string;
}

const PrepaymentsPage: React.FC = () => {
  const { t } = useTranslation();

  // Loading states
  const [loading, setLoading] = useState({
    prepayments: true,
    countries: true,
    action: false,
  });

  // Data state
  const [countries, setCountries] = useState<Country[]>([]);
  const [prepayments, setPrepayments] = useState<Prepayment[]>([]);

  const [modal, setModal] = useState({
    open: false,
    mode: 'create' as 'create' | 'edit',
    prepayment: undefined as Prepayment | undefined
  });

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {}
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

  // Load data on component mount
  useEffect(() => {
    loadPrepayments();
    loadCountries();
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
      currency: apiPrepayment.currency,
      comment: apiPrepayment.comment || '',
      justification_file: apiPrepayment.justification_file,
      status: apiPrepayment.status,
    };
  };

  // Helper function to convert frontend prepayment to API format
  const mapFrontendToApi = (frontendPrepayment: Prepayment) => {
    return {
      reason: frontendPrepayment.reason,
      destination_country_id: frontendPrepayment.destination_country_id,
      start_date: frontendPrepayment.startDate,
      end_date: frontendPrepayment.endDate,
      amount: frontendPrepayment.amount,
      currency: frontendPrepayment.currency,
      comment: frontendPrepayment.comment,
      justification_file: frontendPrepayment.justification_file,
    };
  };

  // Load prepayments from API
  const loadPrepayments = async () => {
    try {
      setLoading(prev => ({ ...prev, prepayments: true }));
      const response = await prepaymentService.getPrepayments();
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
        currency: country.currency,
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
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  // CRUD operations
  const handleCreate = async () => {
    // Ensure the latest countries list is available when opening the modal
    await loadCountries();
    setModal({ open: true, mode: 'create', prepayment: undefined });
  };

  const handleEdit = async (prepayment: Prepayment) => {
    // Ensure the latest countries list is available when opening the modal
    await loadCountries();
    setModal({ open: true, mode: 'edit', prepayment });
  };

  const handleView = (prepayment: Prepayment) => {
    setViewModal({ open: true, prepayment });
  };

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
      }
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
    if (prepayment.status !== 'pending') {
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
      message: `The prepayment for "${prepayment.reason}" is already pending approval and will appear in the approvals queue for authorized users.`,
      onConfirm: () => {
        setSnackbar({
          open: true,
          message: 'Prepayment is in the approval queue. Approvers will be notified.',
          severity: 'info'
        });
      }
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
                    label={prepayment.status}
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
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(prepayment)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  {prepayment.status === 'pending' && (
                    <IconButton
                      size="small"
                      onClick={() => handleSendForApproval(prepayment)}
                      color="success"
                      title="Send for Approval"
                    >
                      <SendIcon />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(prepayment)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
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
        loading={loading.action}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        severity="error"
        confirmText="Delete"
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

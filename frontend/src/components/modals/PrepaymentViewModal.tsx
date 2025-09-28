import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  Grid,
} from '@mui/material';
import {
  Description as DocumentIcon,
  FlightTakeoff as TravelIcon,
  AccountBalance as MoneyIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import apiClient from '../../services/apiClient';
import EntityHistoryModal from '../forms/EntityHistoryModal';

interface Prepayment {
  id?: number;
  reason: string;
  destination_country_id: number;
  destination: string;
  startDate: string;
  endDate: string;
  amount: string | number;
  currency: string;
  comment: string;
  justification_files?: Array<{filename: string, original_name: string, file_path: string}>;
  status: string;
  rejection_reason?: string;
  rejecting_approver_name?: string;
}

interface PrepaymentViewModalProps {
  open: boolean;
  onClose: () => void;
  prepayment?: Prepayment;
}

const PrepaymentViewModal: React.FC<PrepaymentViewModalProps> = ({ open, onClose, prepayment }) => {
  const { t, i18n } = useTranslation();
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!prepayment) {
    return null;
  }

  // Bilingual status labels
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

  const getStatusDescription = (status: string) => {
    const lang = i18n.language?.startsWith('es') ? 'es' : 'en';
    const descriptions: Record<string, { en: string; es: string }> = {
      pending: { en: 'Waiting to be sent for approval', es: 'Esperando ser enviado para aprobación' },
      supervisor_pending: { en: 'Under supervisor review', es: 'En revisión por jefatura' },
      accounting_pending: { en: 'Under accounting review', es: 'En revisión por contabilidad' },
      treasury_pending: { en: 'Under treasury review', es: 'En revisión por tesorería' },
      approved: { en: 'Approved and ready for travel', es: 'Aprobado y listo para viaje' },
      approved_for_reimbursement: { en: 'Approved for reimbursement', es: 'Aprobado para reembolso' },
      funds_return_pending: { en: 'Funds return pending', es: 'Devolución de fondos pendiente' },
      rejected: { en: 'Rejected - please review and resubmit', es: 'Rechazado - revisar y reenviar' },
    };
    const entry = descriptions[status.toLowerCase()];
    return entry ? entry[lang] : '';
  };

  const handleFileDownload = async (filename: string) => {
    try {
      // Use authenticated API call to download the file
      const response = await apiClient.get(`/prepayments/${prepayment?.id}/download/${filename}`, {
        responseType: 'blob'
      });
      
      // Create a temporary URL for the blob and trigger download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to download file';
      if (error.response?.status === 404) {
        errorMessage = 'File not found. The file may have been moved or deleted.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to download this file.';
      }
      
      // You can replace this with a proper toast notification
      alert(errorMessage);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'warning';
      case 'supervisor_pending':
      case 'accounting_pending':
      case 'treasury_pending':
        return 'info';
      case 'approved':
      case 'approved_for_reimbursement':
        return 'success';
      case 'rejected':
        return 'error';
      case 'funds_return_pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const calculateDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end date
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">{t('prepayments.detailsTitle')} (ID: {prepayment.id})</Typography>
          <Chip
            label={getStatusLabel(prepayment.status)}
            color={getStatusColor(prepayment.status) as any}
            variant="outlined"
          />
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Trip Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom color="primary">
              <TravelIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              {t('prepayments.tripInformation')}
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              {t('prepayments.reason')}
            </Typography>
            <Typography variant="body1" paragraph>
              {prepayment.reason}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              {t('prepayments.destination')}
            </Typography>
            <Typography variant="body1" paragraph>
              {prepayment.destination}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              {t('prepayments.duration')}
            </Typography>
            <Typography variant="body1" paragraph>
              {calculateDays(prepayment.startDate, prepayment.endDate)} {t('prepayments.days')}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              {t('prepayments.startDate')}
            </Typography>
            <Typography variant="body1" paragraph>
              {prepayment.startDate}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              {t('prepayments.endDate')}
            </Typography>
            <Typography variant="body1" paragraph>
              {prepayment.endDate}
            </Typography>
          </Grid>

          {/* Financial Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
              <MoneyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              {t('prepayments.financialInformation')}
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              {t('prepayments.amountRequested')}
            </Typography>
            <Typography variant="h5" color="primary" paragraph>
              {prepayment.currency} {(prepayment.amount || 0).toLocaleString()}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              {t('prepayments.currency')}
            </Typography>
            <Typography variant="body1" paragraph>
              {prepayment.currency}
            </Typography>
          </Grid>

          {/* Additional Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
              {t('prepayments.additionalInformation')}
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          {prepayment.comment && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                {t('prepayments.comments')}
              </Typography>
              <Typography variant="body1" paragraph>
                {prepayment.comment}
              </Typography>
            </Grid>
          )}

          {/* Justification Files */}
          {prepayment.justification_files && prepayment.justification_files.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
                {t('prepayments.justificationFile')} ({prepayment.justification_files.length} file{prepayment.justification_files.length > 1 ? 's' : ''})
              </Typography>
              {prepayment.justification_files.map((file, index) => (
                <Box 
                  key={index}
                  display="flex" 
                  alignItems="center" 
                  sx={{ 
                    cursor: 'pointer', 
                    p: 1.5, 
                    border: 1, 
                    borderColor: 'divider', 
                    borderRadius: 1,
                    mb: index < prepayment.justification_files!.length - 1 ? 1 : 1.5,
                    '&:hover': { 
                      bgcolor: 'action.hover',
                      borderColor: 'primary.main'
                    }
                  }}
                  onClick={() => handleFileDownload(file.filename)}
                >
                  <DocumentIcon sx={{ mr: 2, color: 'primary.main', fontSize: 30 }} />
                  <Box>
                    <Typography variant="body1" color="primary" sx={{ fontWeight: 'medium' }}>
                      {file.original_name || file.filename}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
{t('validation.clickToDownload', { number: index + 1 })}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Grid>
          )}

          {prepayment.status.toLowerCase() === 'rejected' && prepayment.rejection_reason && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Rejection Reason
              </Typography>
              <Typography variant="body1" color="error" paragraph>
                {prepayment.rejection_reason}
              </Typography>
            </Grid>
          )}


          {/* Status Information */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              {t('prepayments.currentStatus')}
            </Typography>
            <Box display="flex" alignItems="center">
              <Chip
                label={getStatusLabel(prepayment.status)}
                color={getStatusColor(prepayment.status) as any}
                size="medium"
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                {getStatusDescription(prepayment.status)}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        {prepayment.id && (
          <Button onClick={() => setHistoryOpen(true)} startIcon={<HistoryIcon />} color="inherit">
            {t('common.history')}
          </Button>
        )}
        <Button onClick={onClose} color="primary">
          {t('common.close')}
        </Button>
      </DialogActions>
      
      <EntityHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entityType="prepayment"
        entityId={prepayment.id || null}
      />
    </Dialog>
  );
};

export default PrepaymentViewModal;


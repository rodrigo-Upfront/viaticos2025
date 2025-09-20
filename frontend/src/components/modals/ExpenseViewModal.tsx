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
import HistoryIcon from '@mui/icons-material/History';
import ExpenseRejectionHistoryModal from '../forms/ExpenseRejectionHistoryModal';
import {
  Receipt as ReceiptIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

// Expense status labels
const EXPENSE_STATUS_LABELS: Record<string, { en: string; es: string }> = {
  pending: { 
    en: "Pending", 
    es: "Pendiente" 
  },
  in_process: { 
    en: "In Process", 
    es: "En Proceso" 
  },
  approved: { 
    en: "Approved", 
    es: "Aprobado" 
  },
  rejected: { 
    en: "Rejected", 
    es: "Rechazado" 
  },
};

interface Expense {
  id?: number;
  category_id: number;
  category: string;
  travel_expense_report_id: number;
  travel_expense_report?: string;
  purpose: string;
  document_type: 'Boleta' | 'Factura' | 'BOLETA' | 'FACTURA';
  boleta_supplier?: string;
  factura_supplier_id?: number;
  factura_supplier?: string;
  factura_supplier_name?: string;
  expense_date: string;
  country_id: number;
  country: string;
  country_name?: string;
  currency: string;
  currency_code?: string;
  amount: string | number;
  document_number: string;
  taxable: 'Si' | 'No' | 'SI' | 'NO';
  tax_id?: number;
  tax_code?: string;
  tax_regime?: string;
  document_file?: string;
  comments?: string;
  status: 'pending' | 'in_process' | 'approved' | 'rejected' | 'PENDING' | 'IN_PROCESS' | 'APPROVED' | 'REJECTED';
}

interface ExpenseViewModalProps {
  open: boolean;
  onClose: () => void;
  expense?: Expense;
}

const ExpenseViewModal: React.FC<ExpenseViewModalProps> = ({ open, onClose, expense }) => {
  const { t, i18n } = useTranslation();
  const [historyOpen, setHistoryOpen] = useState(false);
  
  if (!expense) {
    return null;
  }

  const handleFileDownload = async (filename: string) => {
    try {
      if (!expense?.id) {
        alert('Cannot download file: Expense ID not available');
        return;
      }

      // Import apiClient
      const { default: apiClient } = await import('../../services/apiClient');
      
      // Use authenticated API call to download the file (same pattern as prepayments)
      const response = await apiClient.get(`/expenses/${expense.id}/download/${filename}`, {
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
      
      alert(errorMessage);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'warning';
      case 'in_process':
        return 'info';
      case 'approved':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const lang = i18n.language?.startsWith('es') ? 'es' : 'en';
    const entry = EXPENSE_STATUS_LABELS[status.toLowerCase()];
    return entry ? entry[lang] : status;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">{t('expenses.expenseDetails')} (ID: {expense.id})</Typography>
          <Chip
            label={getStatusLabel(expense.status)}
            color={getStatusColor(expense.status) as any}
            variant="outlined"
          />
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom color="primary">
              {t('expenses.basicInformation')}
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
              {t('common.category')}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1.5 }}>
              {expense.category}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
              {t('expenses.travelExpenseReport')}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1.5 }}>
              {expense.travel_expense_report_id ? (expense.travel_expense_report || `Report ${expense.travel_expense_report_id}`) : 'Reimbursement'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
              {t('common.country')}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1.5 }}>
              {expense.country_name || expense.country || 'Unknown'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
              {t('expenses.expenseDate')}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1.5 }}>
              {expense.expense_date}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
              {t('expenses.purpose')}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1.5 }}>
              {expense.purpose}
            </Typography>
          </Grid>

          {/* Financial Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
              {t('expenses.financialInformation')}
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
              {t('common.amount')}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1.5, fontWeight: 'bold' }}>
              {expense.currency_code || expense.currency} {expense.amount.toLocaleString()}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
              {t('expenses.taxable')}
            </Typography>
            <Box sx={{ mb: 1.5 }}>
              <Chip
                label={expense.taxable === 'SI' || expense.taxable === 'Si' ? 'Yes' : 'No'}
                color={expense.taxable === 'SI' || expense.taxable === 'Si' ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Grid>

          {/* Tax field - only show if taxable and has tax info */}
          {(expense.taxable === 'SI' || expense.taxable === 'Si') && expense.tax_code && (
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
                {t('expenses.tax')}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1.5 }}>
                {expense.tax_code} - {expense.tax_regime}
              </Typography>
            </Grid>
          )}

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
              {t('expenses.documentType')}
            </Typography>
            <Box display="flex" alignItems="center" sx={{ mb: 1.5 }}>
              <ReceiptIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body1">
                {expense.document_type === 'BOLETA' ? 'Boleta' : 
                 expense.document_type === 'FACTURA' ? 'Factura' : 
                 expense.document_type}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
              {t('expenses.documentNumber')}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1.5 }}>
              {expense.document_number || 'N/A'}
            </Typography>
          </Grid>

          {/* Supplier Information */}
          {(expense.document_type === 'Boleta' || expense.document_type === 'BOLETA') && expense.boleta_supplier && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
                {t('expenses.boletaSupplier')}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1.5 }}>
                {expense.boleta_supplier}
              </Typography>
            </Grid>
          )}

          {(expense.document_type === 'Factura' || expense.document_type === 'FACTURA') && (expense.factura_supplier_name || expense.factura_supplier) && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
                {t('expenses.facturaSupplier')}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1.5 }}>
                {expense.factura_supplier_name || expense.factura_supplier}
              </Typography>
            </Grid>
          )}

          {/* Additional Information */}
          {(expense.document_file || expense.comments) && (
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                {t('prepayments.additionalInformation')}
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
            </Grid>
          )}

          {/* Document File */}
          {expense.document_file && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
                {t('expenses.documentFile')}
              </Typography>
              <Box 
                display="flex" 
                alignItems="center" 
                sx={{ 
                  cursor: 'pointer', 
                  p: 1.5, 
                  border: 1, 
                  borderColor: 'divider', 
                  borderRadius: 1,
                  mb: 1.5,
                  '&:hover': { 
                    bgcolor: 'action.hover',
                    borderColor: 'primary.main'
                  }
                }}
                onClick={() => handleFileDownload(expense.document_file!)}
              >
                <DocumentIcon sx={{ mr: 2, color: 'primary.main', fontSize: 30 }} />
                <Box>
                  <Typography variant="body1" color="primary" sx={{ fontWeight: 'medium' }}>
                    {expense.document_file}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('common.downloadFile')} • {t('expenses.attachment')}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          )}

        </Grid>
      </DialogContent>
      <DialogActions>
        {expense?.id && (
          <Button onClick={() => setHistoryOpen(true)} startIcon={<HistoryIcon />} color="inherit">
            {t('expenses.rejectionHistory')}
          </Button>
        )}
        <Button onClick={onClose} color="primary">
{t('common.close')}
        </Button>
        {expense.document_file && (
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => handleFileDownload(expense.document_file!)}
          >
{t('common.downloadFile')}
          </Button>
        )}
      </DialogActions>

      <ExpenseRejectionHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        expenseId={expense?.id || null}
      />
    </Dialog>
  );
};

export default ExpenseViewModal;

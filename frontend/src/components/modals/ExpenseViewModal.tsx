import React from 'react';
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
  Receipt as ReceiptIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';

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
  amount: number;
  document_number: string;
  taxable: 'Si' | 'No' | 'SI' | 'NO';
  document_file?: string;
  comments?: string;
  status: 'pending' | 'in_process' | 'approved' | 'PENDING' | 'IN_PROCESS' | 'APPROVED' | 'REJECTED';
}

interface ExpenseViewModalProps {
  open: boolean;
  onClose: () => void;
  expense?: Expense;
}

const ExpenseViewModal: React.FC<ExpenseViewModalProps> = ({ open, onClose, expense }) => {
  if (!expense) {
    return null;
  }

  const handleFileDownload = (filename: string) => {
    try {
      // Create a download URL for the file
      const fileUrl = `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api'}/files/download/${encodeURIComponent(filename)}`;
      
      // Create a temporary download link
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file. Please try again.');
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
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Pending';
      case 'in_process':
        return 'In Process';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Expense Details (ID: {expense.id})</Typography>
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
              Basic Information
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
              Category
            </Typography>
            <Typography variant="body1" sx={{ mb: 1.5 }}>
              {expense.category}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
              Travel Expense Report
            </Typography>
            <Typography variant="body1" sx={{ mb: 1.5 }}>
              {expense.travel_expense_report_id ? (expense.travel_expense_report || `Report ${expense.travel_expense_report_id}`) : 'Reimbursement'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
              Country
            </Typography>
            <Typography variant="body1" sx={{ mb: 1.5 }}>
              {expense.country_name || expense.country || 'Unknown'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
              Expense Date
            </Typography>
            <Typography variant="body1" sx={{ mb: 1.5 }}>
              {expense.expense_date}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
              Purpose
            </Typography>
            <Typography variant="body1" sx={{ mb: 1.5 }}>
              {expense.purpose}
            </Typography>
          </Grid>

          {/* Financial Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
              Financial Information
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
              Amount
            </Typography>
            <Typography variant="body1" sx={{ mb: 1.5, fontWeight: 'bold' }}>
              {expense.currency_code || expense.currency} {expense.amount.toLocaleString()}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
              Taxable
            </Typography>
            <Box sx={{ mb: 1.5 }}>
              <Chip
                label={expense.taxable === 'SI' || expense.taxable === 'Si' ? 'Yes' : 'No'}
                color={expense.taxable === 'SI' || expense.taxable === 'Si' ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
              Document Type
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
              Document Number
            </Typography>
            <Typography variant="body1" sx={{ mb: 1.5 }}>
              {expense.document_number || 'N/A'}
            </Typography>
          </Grid>

          {/* Supplier Information */}
          {(expense.document_type === 'Boleta' || expense.document_type === 'BOLETA') && expense.boleta_supplier && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
                Boleta Supplier
              </Typography>
              <Typography variant="body1" sx={{ mb: 1.5 }}>
                {expense.boleta_supplier}
              </Typography>
            </Grid>
          )}

          {(expense.document_type === 'Factura' || expense.document_type === 'FACTURA') && (expense.factura_supplier_name || expense.factura_supplier) && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
                Factura Supplier
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
                Additional Information
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
            </Grid>
          )}

          {/* Document File */}
          {expense.document_file && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
                Document File
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
                    Click to download • Document attachment
                  </Typography>
                </Box>
              </Box>
            </Grid>
          )}

          {/* Comments */}
          {expense.comments && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
                Comments
              </Typography>
              <Typography variant="body1" sx={{ mb: 1.5 }}>
                {expense.comments}
              </Typography>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
        <Button variant="outlined" color="primary">
          Print
        </Button>
        {expense.document_file && (
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => handleFileDownload(expense.document_file!)}
          >
            Download File
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ExpenseViewModal;

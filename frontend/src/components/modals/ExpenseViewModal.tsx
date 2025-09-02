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
  document_type: 'Boleta' | 'Factura';
  boleta_supplier?: string;
  factura_supplier_id?: number;
  factura_supplier?: string;
  expense_date: string;
  country_id: number;
  country: string;
  currency: string;
  amount: number;
  document_number: string;
  taxable: 'Si' | 'No';
  document_file?: string;
  comments?: string;
  status: 'pending' | 'in_process' | 'approved';
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
    // Placeholder for file download functionality
    console.log('Download file:', filename);
    
    // Create a temporary download link for demonstration
    // In a real application, this would call the backend API
    const link = document.createElement('a');
    link.href = '#'; // This would be the actual file URL from backend
    link.download = filename;
    link.click();
    
    alert(`Download functionality not yet implemented for: ${filename}\n\nIn a real application, this would download the file from the server.`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Expense Details (ID: {expense.id})</Typography>
          <Chip
            label={expense.status}
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
              {expense.travel_expense_report_id ? (expense.travel_expense_report || `Report`) : 'Reimbursement'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
              Country
            </Typography>
            <Typography variant="body1" sx={{ mb: 1.5 }}>
              {expense.country}
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
              {expense.currency} {expense.amount.toLocaleString()}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
              Taxable
            </Typography>
            <Box sx={{ mb: 1.5 }}>
              <Chip
                label={expense.taxable}
                color={expense.taxable === 'Si' ? 'success' : 'default'}
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
              <Typography variant="body1">{expense.document_type}</Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
              Document Number
            </Typography>
            <Typography variant="body1" sx={{ mb: 1.5 }}>
              {expense.document_number}
            </Typography>
          </Grid>

          {/* Supplier Information */}
          {expense.document_type === 'Boleta' && expense.boleta_supplier && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
                Boleta Supplier
              </Typography>
              <Typography variant="body1" sx={{ mb: 1.5 }}>
                {expense.boleta_supplier}
              </Typography>
            </Grid>
          )}

          {expense.document_type === 'Factura' && expense.factura_supplier && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
                Factura Supplier
              </Typography>
              <Typography variant="body1" sx={{ mb: 1.5 }}>
                {expense.factura_supplier}
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

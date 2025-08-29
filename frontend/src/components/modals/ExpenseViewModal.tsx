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
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom color="primary">
              Basic Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Category
            </Typography>
            <Typography variant="body1" paragraph>
              {expense.category}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Travel Expense Report
            </Typography>
            <Typography variant="body1" paragraph>
              {expense.travel_expense_report || `Report ID: ${expense.travel_expense_report_id}`}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Purpose
            </Typography>
            <Typography variant="body1" paragraph>
              {expense.purpose}
            </Typography>
          </Grid>

          {/* Financial Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom color="primary">
              Financial Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} sm={4}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Amount
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>{expense.currency} {expense.amount.toLocaleString()}</strong>
            </Typography>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Country
            </Typography>
            <Typography variant="body1" paragraph>
              {expense.country}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Expense Date
            </Typography>
            <Typography variant="body1" paragraph>
              {expense.expense_date}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Taxable
            </Typography>
            <Chip
              label={expense.taxable}
              color={expense.taxable === 'Si' ? 'success' : 'default'}
              size="small"
            />
          </Grid>

          {/* Document Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom color="primary">
              Document Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Document Type
            </Typography>
            <Box display="flex" alignItems="center">
              <ReceiptIcon fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body1">{expense.document_type}</Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Document Number
            </Typography>
            <Typography variant="body1" paragraph>
              {expense.document_number}
            </Typography>
          </Grid>

          {/* Supplier Information */}
          {expense.document_type === 'Boleta' && expense.boleta_supplier && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Boleta Supplier
              </Typography>
              <Typography variant="body1" paragraph>
                {expense.boleta_supplier}
              </Typography>
            </Grid>
          )}

          {expense.document_type === 'Factura' && expense.factura_supplier && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Factura Supplier
              </Typography>
              <Typography variant="body1" paragraph>
                {expense.factura_supplier}
              </Typography>
            </Grid>
          )}

          {/* Document File */}
          {expense.document_file && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
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
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Comments
              </Typography>
              <Typography variant="body1" paragraph>
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

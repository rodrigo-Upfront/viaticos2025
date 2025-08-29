import React, { useState, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  AccountBalance as MoneyIcon,
  Receipt as ReceiptIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import apiClient from '../../services/apiClient';

interface Expense {
  id: number;
  category_name: string;
  purpose: string;
  amount: number;
  currency: string;
  expense_date: string;
  document_type: string;
}

interface ExpenseReport {
  id: number;
  prepaymentId: number;
  reportDate: string;
  totalExpenses: number;
  prepaidAmount: number;
  budgetStatus: string;
  status: string;
  // Additional fields for view modal
  reason?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  requestingUser?: string;
  expenses?: Array<{
    id: number;
    category: string;
    purpose: string;
    amount: number;
    currency: string;
    date: string;
    documentType: string;
  }>;
}

interface ReportViewModalProps {
  open: boolean;
  onClose: () => void;
  report?: ExpenseReport;
}

const ReportViewModal: React.FC<ReportViewModalProps> = ({ open, onClose, report }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && report?.id) {
      loadExpenses();
    }
  }, [open, report?.id]);

  const loadExpenses = async () => {
    if (!report?.id) return;
    
    try {
      setLoading(true);
      const response = await apiClient.get(`/expenses/?report_id=${report.id}`);
      setExpenses(response.data.expenses || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  if (!report) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'in_progress':
        return 'info';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getBudgetStatusColor = (status: string) => {
    return status === 'Under-Budget' ? 'success' : 'error';
  };

  const getBudgetIcon = (status: string) => {
    return status === 'Under-Budget' ? <TrendingDownIcon /> : <TrendingUpIcon />;
  };

  const remainingBudget = (report.prepaidAmount || 0) - (report.totalExpenses || 0);
  const isOverBudget = remainingBudget < 0;

  // Calculate actual totals from loaded expenses (convert string amounts to numbers)
  const actualTotal = expenses.reduce((sum, expense) => {
    const amount = typeof expense.amount === 'string' ? parseFloat(expense.amount) : (expense.amount || 0);
    return sum + amount;
  }, 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Travel Expense Report (ID: {report.id})</Typography>
          <Box display="flex" gap={1}>
            <Chip
              label={report.status}
              color={getStatusColor(report.status) as any}
              variant="outlined"
            />
            <Chip
              label={report.budgetStatus}
              color={getBudgetStatusColor(report.budgetStatus) as any}
              icon={getBudgetIcon(report.budgetStatus)}
              variant="outlined"
            />
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Report Summary */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom color="primary">
              Report Summary
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <MoneyIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6" color="primary">
                ${(report.prepaidAmount || 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Prepaid Amount
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <ReceiptIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6" color="warning.main">
                ${(report.totalExpenses || 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Expenses
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              {getBudgetIcon(report.budgetStatus)}
              <Typography 
                variant="h6" 
                color={isOverBudget ? 'error.main' : 'success.main'}
                sx={{ mt: 1 }}
              >
                ${Math.abs(remainingBudget || 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {isOverBudget ? 'Over Budget' : 'Remaining'}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6" color="textPrimary">
                {expenses.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Expense Count
              </Typography>
            </Paper>
          </Grid>

          {/* Report Details */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
              Report Details
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Related Prepayment ID
            </Typography>
            <Typography variant="body1" paragraph>
              #{report.prepaymentId}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Report Date
            </Typography>
            <Typography variant="body1" paragraph>
              {report.reportDate}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Trip Dates
            </Typography>
            <Typography variant="body1" paragraph>
              {report.startDate || '2025-08-15'} to {report.endDate || '2025-08-18'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Destination
            </Typography>
            <Typography variant="body1" paragraph>
              {report.destination || 'Lima, Peru'}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Reason/Purpose
            </Typography>
            <Typography variant="body1" paragraph>
              {report.reason || 'Business travel for client meetings and project coordination'}
            </Typography>
          </Grid>

          {/* Expense Breakdown */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
              Expense Breakdown
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12}>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Purpose</TableCell>
                    <TableCell>Document</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={24} />
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Loading expenses...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="textSecondary">
                          No expenses found for this report
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{expense.expense_date}</TableCell>
                        <TableCell>{expense.category_name}</TableCell>
                        <TableCell>{expense.purpose}</TableCell>
                        <TableCell>
                          <Chip 
                            label={expense.document_type} 
                            size="small" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <strong>{expense.currency} {(typeof expense.amount === 'string' ? parseFloat(expense.amount) : (expense.amount || 0)).toLocaleString()}</strong>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {!loading && expenses.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="right">
                        <strong>Actual Total:</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{expenses[0]?.currency || 'USD'} {actualTotal.toLocaleString()}</strong>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
        <Button 
          variant="outlined" 
          color="primary"
          onClick={() => {
            alert(`Export functionality will be implemented.\n\nThis would export the report data to CSV/Excel format.`);
          }}
        >
          Export Report
        </Button>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => {
            alert(`PDF generation functionality will be implemented.\n\nThis would generate and download a PDF report.`);
          }}
        >
          Download PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportViewModal;


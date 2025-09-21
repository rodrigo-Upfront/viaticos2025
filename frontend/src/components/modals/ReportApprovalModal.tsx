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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  IconButton,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import apiClient from '../../services/apiClient';
import AccountingApprovalModal from './AccountingApprovalModal';

// Report status labels
const REPORT_STATUS_LABELS: Record<string, { en: string; es: string }> = {
  pending: { 
    en: "Pending Submit", 
    es: "Pendiente Rendición de Gastos" 
  },
  supervisor_pending: { 
    en: "Supervisor Review", 
    es: "Revisión Jefatura" 
  },
  accounting_pending: { 
    en: "Accounting Review", 
    es: "Revisión Contabilidad" 
  },
  treasury_pending: { 
    en: "Treasury Review", 
    es: "Revisión Tesorería" 
  },
  approved_for_reimbursement: { 
    en: "Approved for Reimbursement", 
    es: "Aprobado para Reembolso" 
  },
  funds_return_pending: { 
    en: "Funds Return Pending", 
    es: "Pendiente Devolución" 
  },
  review_return: { 
    en: "Return Documents Review", 
    es: "Revisar Doc. Devolución" 
  },
  approved: { 
    en: "Approved", 
    es: "Aprobado" 
  },
  approved_expenses: { 
    en: "Expenses Approved", 
    es: "Gastos Aprobados" 
  },
  approved_repaid: { 
    en: "Trip Reimbursed", 
    es: "Viaje Reembolsado" 
  },
  approved_returned_funds: { 
    en: "Funds Returned", 
    es: "Devolución Realizada" 
  },
  rejected: { 
    en: "Rejected", 
    es: "Rechazado" 
  },
};

interface Expense {
  id: number;
  category_name: string;
  purpose: string;
  amount: string;
  currency_code: string;
  expense_date: string;
  status: string;
  rejection_reason?: string;
}

interface ExpenseReport {
  id: number;
  prepaymentId: number;
  reportDate: string;
  totalExpenses: number;
  prepaidAmount: number;
  budgetStatus: string;
  status: string;
  requester?: string;
  // Reimbursement-specific fields
  report_type?: string;
  reimbursement_reason?: string;
  reimbursement_country?: string;
  reimbursement_start_date?: string;
  reimbursement_end_date?: string;
  prepayment_reason?: string;
  prepayment_destination?: string;
  currency?: string;  // Unified currency field
}

interface ExpenseRejection {
  expense_id: number;
  rejection_reason: string;
}

interface ReportApprovalModalProps {
  open: boolean;
  onClose: () => void;
  report?: ExpenseReport;
  onApprovalComplete?: () => void;
}

const ReportApprovalModal: React.FC<ReportApprovalModalProps> = ({
  open,
  onClose,
  report,
  onApprovalComplete
}) => {
  const { i18n } = useTranslation();
  
  // Function to get user-friendly status labels
  const getStatusLabel = (status: string): string => {
    const lang = i18n.language?.startsWith('es') ? 'es' : 'en';
    const entry = REPORT_STATUS_LABELS[status.toLowerCase()];
    return entry ? entry[lang] : status;
  };

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [rejectionReasons, setRejectionReasons] = useState<Record<number, string>>({});
  const [error, setError] = useState<string>('');
  // const [expenseActions, setExpenseActions] = useState<Record<number, 'approve' | 'reject' | null>>({});
  const [expenseRejectionReasons, setExpenseRejectionReasons] = useState<Record<number, string>>({});
  
  // Accounting approval modal state
  const [accountingModal, setAccountingModal] = useState({
    open: false,
    reportId: 0
  });

  // Helper function to determine user role based on report status
  const getUserRole = () => {
    if (!report) return 'other';
    
    const status = report.status || 'unknown';
    if (status === 'SUPERVISOR_PENDING') return 'supervisor';
    if (status === 'ACCOUNTING_PENDING') return 'accounting';
    if (status === 'TREASURY_PENDING' || status === 'APPROVED_FOR_REIMBURSEMENT' || status === 'FUNDS_RETURN_PENDING') return 'treasury';
    return 'other';
  };

  const isAccountingUser = getUserRole() === 'accounting';

  useEffect(() => {
    if (open && report?.id) {
      loadExpenses();
      // Initialize rejection reasons from existing data
      const initialReasons: Record<number, string> = {};
      expenses.forEach(expense => {
        if (expense.rejection_reason) {
          initialReasons[expense.id] = expense.rejection_reason;
        }
      });
      setRejectionReasons(initialReasons);
    }
  }, [open, report?.id]);

  const loadExpenses = async () => {
    if (!report?.id) return;
    
    try {
      setLoading(true);
      const response = await apiClient.get(`/expenses/?report_id=${report.id}`);
      const expensesData = response.data.expenses || [];
      const sortedExpenses = expensesData.sort((a: Expense, b: Expense) => {
        // Sort by date DESC, then by category ASC
        const dateCompare = new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return (a.category_name || '').localeCompare(b.category_name || '');
      });
      setExpenses(sortedExpenses);
      
      // Initialize rejection reasons and expand rejected expenses
      const initialReasons: Record<number, string> = {};
      const expandedSet = new Set<number>();
      sortedExpenses.forEach((expense: Expense) => {
        if (expense.rejection_reason) {
          initialReasons[expense.id] = expense.rejection_reason;
          expandedSet.add(expense.id);
        }
      });
      setRejectionReasons(initialReasons);
      setExpandedRows(expandedSet);
    } catch (error: any) {
      console.error('Error loading expenses:', error);
      setError('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (expenseId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(expenseId)) {
      newExpanded.delete(expenseId);
    } else {
      newExpanded.add(expenseId);
    }
    setExpandedRows(newExpanded);
  };

  const handleRejectionReasonChange = (expenseId: number, reason: string) => {
    setRejectionReasons(prev => ({
      ...prev,
      [expenseId]: reason
    }));
  };

  const getExpenseBackgroundColor = (expense: Expense) => {
    if (expense.status.toLowerCase() === 'rejected') {
      return '#ffebee'; // Red background for currently rejected
    }
    if (expense.rejection_reason && expense.status.toLowerCase() === 'pending') {
      return '#fff3e0'; // Light red background for previously rejected
    }
    if (expense.status.toLowerCase() === 'approved') {
      return '#e8f5e8'; // Green background for approved
    }
    return 'transparent';
  };

  const calculateTotal = () => {
    return expenses.reduce((sum, expense) => {
      const amount = parseFloat(expense.amount) || 0;
      return sum + amount;
    }, 0);
  };

  const handleApprove = async () => {
    // Check if any expense has rejection reason
    const hasRejections = Object.values(rejectionReasons).some(reason => reason.trim().length > 0);
    if (hasRejections) {
      setError('Cannot approve report with rejected expenses. Please resolve rejections first.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      await apiClient.post(`/approvals/reports/${report?.id}/approve`, {
        action: 'approve'
      });

      if (onApprovalComplete) {
        onApprovalComplete();
      }
      onClose();
    } catch (error: any) {
      setError(error?.response?.data?.detail || 'Failed to approve report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    // Validate that at least one expense has a rejection reason
    const expenseRejections: ExpenseRejection[] = [];
    Object.entries(rejectionReasons).forEach(([expenseId, reason]) => {
      if (reason.trim().length > 0) {
        expenseRejections.push({
          expense_id: parseInt(expenseId),
          rejection_reason: reason.trim()
        });
      }
    });

    if (expenseRejections.length === 0) {
      setError('At least one expense must have a rejection reason to reject the report');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      await apiClient.post(`/approvals/reports/${report?.id}/approve`, {
        action: 'reject',
        expense_rejections: expenseRejections
      });

      if (onApprovalComplete) {
        onApprovalComplete();
      }
      onClose();
    } catch (error: any) {
      setError(error?.response?.data?.detail || 'Failed to reject report');
    } finally {
      setSubmitting(false);
    }
  };

  // Expense-level approval handlers for accounting users
  const handleExpenseApprove = async (expenseId: number) => {
    try {
      setSubmitting(true);
      setError('');
      
      const response = await apiClient.post(`/approvals/expenses/${expenseId}/approve`);
      
      // Update local expense status
      setExpenses(prev => prev.map(expense => 
        expense.id === expenseId 
          ? { ...expense, status: 'APPROVED', rejection_reason: undefined }
          : expense
      ));
      
      // Check if accounting approval is required (all expenses approved by accounting user)
      if (response.data.accounting_approval_required) {
        // Open accounting approval modal
        setAccountingModal({
          open: true,
          reportId: response.data.report_id
        });
      } else if (response.data.report_status_changed) {
        // Regular flow - all expenses processed
        if (onApprovalComplete) {
          onApprovalComplete();
        }
        onClose();
      }
    } catch (error: any) {
      setError(error?.response?.data?.detail || 'Failed to approve expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpenseReject = async (expenseId: number, rejectionReason: string) => {
    if (!rejectionReason.trim()) {
      setError('Rejection reason is required');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      const response = await apiClient.post(`/approvals/expenses/${expenseId}/reject`, {
        action: 'reject',
        rejection_reason: rejectionReason
      });
      
      // Update local expense status
      setExpenses(prev => prev.map(expense => 
        expense.id === expenseId 
          ? { ...expense, status: 'REJECTED', rejection_reason: rejectionReason }
          : expense
      ));
      
      // Check if report status changed (all expenses processed)
      if (response.data.report_status_changed) {
        if (onApprovalComplete) {
          onApprovalComplete();
        }
        onClose();
      }
    } catch (error: any) {
      setError(error?.response?.data?.detail || 'Failed to reject expense');
    } finally {
      setSubmitting(false);
    }
  };

  if (!report) {
    return null;
  }

  const total = calculateTotal();
  const currencySymbol = expenses[0]?.currency_code || '$';
  const requestingUserName = report?.requester || 'N/A';

  return (
    <>
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            Approve Travel Expense Report (ID: {report.id})
          </Typography>
          <Box display="flex" gap={1}>
            <Chip
              label={report.report_type || 'PREPAYMENT'}
              color={report.report_type === 'REIMBURSEMENT' ? 'secondary' : 'primary'}
              variant="filled"
            />
            <Chip
              label={getStatusLabel(report.status)}
              color="warning"
              variant="outlined"
            />
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {/* Report Summary */}
        <Box mb={3}>
          <Typography variant="h6" gutterBottom color="primary">
            Report Summary
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                Requester
              </Typography>
              <Typography variant="body1">
                {requestingUserName}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                Total Amount
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {currencySymbol}{total.toLocaleString()}
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                Reason/Purpose
              </Typography>
              <Typography variant="body1">
                {report.report_type === 'REIMBURSEMENT' 
                  ? (report.reimbursement_reason || 'N/A')
                  : (report.prepayment_reason || 'N/A')
                }
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" color="textSecondary">
                {report.report_type === 'REIMBURSEMENT' ? 'Country' : 'Destination'}
              </Typography>
              <Typography variant="body1">
                {report.report_type === 'REIMBURSEMENT' 
                  ? (report.reimbursement_country || 'N/A')
                  : (report.prepayment_destination || 'N/A')
                }
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Expenses List */}
        <Box>
          <Typography variant="h6" gutterBottom color="primary">
            Expenses ({expenses.length} items)
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width="50px">
                      <Typography variant="caption" color="textSecondary">
                        Expand
                      </Typography>
                    </TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Purpose</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    {isAccountingUser && <TableCell>Status</TableCell>}
                    {isAccountingUser && <TableCell>Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expenses.map((expense) => (
                    <React.Fragment key={expense.id}>
                      <TableRow 
                        sx={{ 
                          backgroundColor: getExpenseBackgroundColor(expense),
                          '&:hover': { backgroundColor: `${getExpenseBackgroundColor(expense)}dd` }
                        }}
                      >
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => toggleExpanded(expense.id)}
                          >
                            {expandedRows.has(expense.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell>{expense.expense_date}</TableCell>
                        <TableCell>{expense.category_name}</TableCell>
                        <TableCell>{expense.purpose}</TableCell>
                        <TableCell align="right">
                          <strong>{expense.currency_code} {parseFloat(expense.amount).toLocaleString()}</strong>
                        </TableCell>
                        {isAccountingUser && (
                          <TableCell>
                            <Chip 
                              label={expense.status || 'PENDING'} 
                              color={
                                expense.status === 'APPROVED' ? 'success' : 
                                expense.status === 'REJECTED' ? 'error' : 
                                'warning'
                              }
                              size="small"
                            />
                          </TableCell>
                        )}
                        {isAccountingUser && (
                          <TableCell>
                            {expense.status === 'APPROVED' || expense.status === 'REJECTED' ? (
                              <Typography variant="caption" color="text.secondary">
                                {expense.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                              </Typography>
                            ) : (
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleExpenseApprove(expense.id)}
                                  disabled={submitting}
                                  title="Approve Expense"
                                >
                                  <CheckIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    const reason = expenseRejectionReasons[expense.id] || '';
                                    if (!reason.trim()) {
                                      // Expand the row to show rejection reason field
                                      setExpandedRows(prev => new Set(Array.from(prev).concat([expense.id])));
                                      setError('Please enter a rejection reason in the expanded section');
                                    } else {
                                      handleExpenseReject(expense.id, reason);
                                    }
                                  }}
                                  disabled={submitting}
                                  title="Reject Expense"
                                >
                                  <CloseIcon />
                                </IconButton>
                              </Box>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                      
                      <TableRow>
                        <TableCell colSpan={isAccountingUser ? 7 : 5} sx={{ py: 0, border: 0 }}>
                          <Collapse in={expandedRows.has(expense.id)} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                              <Typography variant="subtitle2" gutterBottom>
                                {isAccountingUser ? 'Expense Rejection Reason' : 'Rejection Reason'}
                              </Typography>
                              <TextField
                                fullWidth
                                multiline
                                rows={3}
                                placeholder={expense.rejection_reason || "Enter rejection reason (max 300 characters)"}
                                value={isAccountingUser ? (expenseRejectionReasons[expense.id] || '') : (rejectionReasons[expense.id] || '')}
                                onChange={(e) => {
                                  if (isAccountingUser) {
                                    setExpenseRejectionReasons(prev => ({ ...prev, [expense.id]: e.target.value }));
                                  } else {
                                    handleRejectionReasonChange(expense.id, e.target.value);
                                  }
                                }}
                                inputProps={{ maxLength: 300 }}
                                helperText={`${(rejectionReasons[expense.id] || '').length}/300 characters`}
                                size="small"
                              />
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                  
                  {/* Total Row */}
                  <TableRow sx={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
                    <TableCell colSpan={4} align="right">
                      <strong>Total:</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>{currencySymbol} {total.toLocaleString()}</strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        {!isAccountingUser && (
          <>
            <Button
              onClick={handleReject}
              color="error"
              variant="outlined"
              startIcon={<RejectIcon />}
              disabled={submitting || loading}
            >
              {submitting ? 'Rejecting...' : 'Reject'}
            </Button>
            <Button
              onClick={handleApprove}
              color="success"
              variant="contained"
              startIcon={<ApproveIcon />}
              disabled={submitting || loading}
            >
              {submitting ? 'Approving...' : 'Approve'}
            </Button>
          </>
        )}
        {isAccountingUser && (
          <>
            {/* Check if all expenses are approved to show Resume button */}
            {expenses.length > 0 && expenses.every(exp => exp.status === 'APPROVED') ? (
              <Button
                onClick={() => setAccountingModal({ open: true, reportId: report?.id || 0 })}
                color="primary"
                variant="contained"
                disabled={submitting || loading}
                sx={{ ml: 2 }}
              >
                Resume Accounting Approval
              </Button>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                Approve or reject individual expenses above. The report will be automatically processed when all expenses are reviewed.
              </Typography>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>

    {/* Accounting Approval Modal */}
    <AccountingApprovalModal
      open={accountingModal.open}
      onClose={() => setAccountingModal({ open: false, reportId: 0 })}
      onApprovalComplete={() => {
        setAccountingModal({ open: false, reportId: 0 });
        if (onApprovalComplete) {
          onApprovalComplete();
        }
        onClose();
      }}
      reportId={accountingModal.reportId}
    />
    </>
  );
};

export default ReportApprovalModal;

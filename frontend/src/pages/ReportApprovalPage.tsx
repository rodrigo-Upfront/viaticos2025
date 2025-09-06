import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Paper,
  Typography,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  IconButton,
  TextField,
  Alert,
  CircularProgress,
  Button,
  Grid,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import apiClient from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import ExpenseViewModal from '../components/modals/ExpenseViewModal';

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
  category_id: number;
  category_name: string;
  travel_expense_report_id: number;
  purpose: string;
  document_type: string;
  boleta_supplier?: string;
  factura_supplier_id?: number;
  factura_supplier_name?: string;
  amount: string;
  currency_code: string;
  currency_id: number;
  expense_date: string;
  country_id: number;
  country_name: string;
  document_number: string;
  taxable: string;
  document_file?: string;
  comments?: string;
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
  // Fund return fields
  return_document_number?: string;
  return_document_files?: Array<{
    original_name: string;
    stored_name: string;
    file_path: string;
    size: number;
  }>;
}

interface ExpenseRejection {
  expense_id: number;
  rejection_reason: string;
}

interface CategorySummary {
  category: string;
  count: number;
  amount: number;
  currency: string;
}

const ReportApprovalPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { reportId } = useParams<{ reportId: string }>();
  const { user } = useAuth();
  
  // This component is only used from the Approvals module
  const getBackPath = () => {
    return '/approvals';
  };
  
  // State variables
  const [report, setReport] = useState<ExpenseReport | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [rejectionReasons, setRejectionReasons] = useState<Record<number, string>>({});
  const [error, setError] = useState<string>('');
  const [expenseRejectionReasons, setExpenseRejectionReasons] = useState<Record<number, string>>({});
  // Define the expense type expected by ExpenseViewModal
  const [selectedExpense, setSelectedExpense] = useState<{
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
  } | undefined>(undefined);
  const [expenseDetailModal, setExpenseDetailModal] = useState(false);

  // Function to get user-friendly status labels
  const getStatusLabel = (status: string): string => {
    const lang = i18n.language?.startsWith('es') ? 'es' : 'en';
    const entry = REPORT_STATUS_LABELS[status.toLowerCase()];
    return entry ? entry[lang] : status;
  };

  const getStatusColor = (status: string): "success" | "error" | "warning" | "info" | "default" => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'approved_expenses':
      case 'approved_repaid':
      case 'approved_returned_funds':
        return 'success'; // Green for all approved types
      case 'rejected':
        return 'error';
      case 'supervisor_pending':
      case 'accounting_pending':
      case 'treasury_pending':
        return 'warning';
      case 'funds_return_pending':
      case 'review_return':
        return 'warning'; // Orange for intermediate statuses
      case 'approved_for_reimbursement':
        return 'info';
      default:
        return 'default';
    }
  };

  // Helper function to determine user role based on report status
  const getUserRole = () => {
    if (!report) return 'other';
    
    const status = report.status || 'unknown';
    if (status === 'SUPERVISOR_PENDING') return 'supervisor';
    if (status === 'ACCOUNTING_PENDING') return 'accounting';
    if (status === 'TREASURY_PENDING' || status === 'APPROVED_FOR_REIMBURSEMENT' || status === 'REVIEW_RETURN') return 'treasury';
    return 'other';
  };

  const isAccountingUser = getUserRole() === 'accounting';

  // Calculate category summary
  const getCategorySummary = (): CategorySummary[] => {
    const categoryMap = new Map<string, { count: number; amount: number; currency: string }>();
    
    expenses.forEach(expense => {
      const category = expense.category_name;
      const amount = parseFloat(expense.amount) || 0;
      const currency = expense.currency_code;
      
      if (categoryMap.has(category)) {
        const existing = categoryMap.get(category)!;
        existing.count += 1;
        existing.amount += amount;
      } else {
        categoryMap.set(category, { count: 1, amount, currency });
      }
    });
    
    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      amount: data.amount,
      currency: data.currency
    }));
  };

  // Load report and expenses data
  useEffect(() => {
    if (reportId) {
      loadReportData();
    }
  }, [reportId]);

  const loadReportData = async () => {
    if (!reportId) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Load report details
      const reportResponse = await apiClient.get(`/expense-reports/${reportId}`);
      const reportData = reportResponse.data;
      
      const reportDetails: ExpenseReport = {
        id: reportData.id,
        prepaymentId: reportData.prepayment_id,
        reportDate: reportData.created_at,
        totalExpenses: Number(reportData.total_expenses) || 0,
        prepaidAmount: Number(reportData.prepayment_amount) || 0,
        budgetStatus: reportData.budget_status || 'PENDING',
        status: reportData.status || 'PENDING',
        requester: reportData.requesting_user_name || 
          reportData.requesting_user?.email ||
          (reportData.requesting_user?.name && reportData.requesting_user?.surname 
            ? `${reportData.requesting_user.name} ${reportData.requesting_user.surname}`
            : 'N/A'),
        report_type: reportData.report_type || (reportData.prepayment_id ? 'PREPAYMENT' : 'REIMBURSEMENT'),
        reimbursement_reason: reportData.reimbursement_reason,
        reimbursement_country: reportData.reimbursement_country,
        reimbursement_start_date: reportData.start_date,
        reimbursement_end_date: reportData.end_date,
        prepayment_reason: reportData.prepayment_reason,
        prepayment_destination: reportData.prepayment_destination,
        currency: reportData.currency,
        return_document_number: reportData.return_document_number,
        return_document_files: reportData.return_document_files,
      };
      
      setReport(reportDetails);

      // Load expenses
      const expensesResponse = await apiClient.get(`/expenses/?report_id=${reportId}`);
      const expensesData = expensesResponse.data.expenses || [];
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
      console.error('Error loading report data:', error);
      setError('Failed to load report data. Please try again.');
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

  const handleDownloadFile = async (file: any) => {
    try {
      const response = await apiClient.get(
        `/approvals/reports/${report?.id}/return-documents/${file.stored_name}`,
        { 
          responseType: 'blob',
          headers: {
            'Accept': 'application/octet-stream'
          }
        }
      );
      
      // Create blob URL and trigger download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.original_name;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Failed to download file:', error);
      setError(`Failed to download file: ${error?.response?.data?.detail || error.message}`);
    }
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
      
      await apiClient.post(`/approvals/reports/${reportId}/approve`, {
        action: 'approve'
      });

      navigate(getBackPath(), { 
        state: { message: 'Report approved successfully', severity: 'success' }
      });
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
      
      await apiClient.post(`/approvals/reports/${reportId}/approve`, {
        action: 'reject',
        expense_rejections: expenseRejections
      });

      navigate(getBackPath(), { 
        state: { message: 'Report rejected successfully', severity: 'success' }
      });
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
      
      // Check if report status changed (all expenses processed)
      if (response.data.report_status_changed) {
        navigate(getBackPath(), { 
          state: { message: 'All expenses processed. Report completed.', severity: 'success' }
        });
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
        navigate(getBackPath(), { 
          state: { message: 'All expenses processed. Report completed.', severity: 'success' }
        });
      }
    } catch (error: any) {
      setError(error?.response?.data?.detail || 'Failed to reject expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewExpense = (expense: Expense) => {
    // Convert our expense format to the format expected by ExpenseViewModal
    const convertedExpense = {
      id: expense.id,
      category_id: expense.category_id,
      category: expense.category_name,
      travel_expense_report_id: expense.travel_expense_report_id,
      travel_expense_report: (expense as any).travel_expense_report_name || `Report ${expense.travel_expense_report_id}`,
      purpose: expense.purpose,
      document_type: expense.document_type as 'Boleta' | 'Factura',
      boleta_supplier: expense.boleta_supplier,
      factura_supplier_id: expense.factura_supplier_id,
      factura_supplier: expense.factura_supplier_name,
      factura_supplier_name: expense.factura_supplier_name,
      expense_date: expense.expense_date,
      country_id: expense.country_id,
      country: expense.country_name,
      country_name: expense.country_name,
      currency: expense.currency_code,
      currency_code: expense.currency_code,
      amount: parseFloat(expense.amount),
      document_number: expense.document_number,
      taxable: expense.taxable as 'Si' | 'No',
      document_file: expense.document_file,
      comments: expense.comments || expense.rejection_reason || undefined,
      status: (expense.status.toLowerCase() === 'rejected' ? 'pending' : expense.status.toLowerCase()) as 'pending' | 'in_process' | 'approved'
    };
    
    setSelectedExpense(convertedExpense);
    setExpenseDetailModal(true);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (!report) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Report not found or you don't have permission to view it.
        </Alert>
      </Container>
    );
  }

  const total = calculateTotal();
  const currencySymbol = expenses[0]?.currency_code || 'USD';
  const categorySummary = getCategorySummary();
  const prepaidAmount = report.prepaidAmount || 0;
  const reportReason = report.report_type === 'REIMBURSEMENT' 
    ? (report.reimbursement_reason || 'N/A')
    : (report.prepayment_reason || 'N/A');
  const reportCountry = report.report_type === 'REIMBURSEMENT' 
    ? (report.reimbursement_country || 'N/A')
    : (report.prepayment_destination || 'N/A');

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Integrated Header - matching reference design */}
        <Paper sx={{ 
          borderRadius: 2, 
          boxShadow: 1, 
          mb: 3,
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          {/* Report Header with Back Arrow and Actions */}
          <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Box display="flex" alignItems="flex-start" gap={2}>
                <IconButton 
                  onClick={() => navigate(getBackPath())} 
                  size="medium"
                  sx={{ mt: -0.5 }}
                >
                  <ArrowBackIcon />
                </IconButton>
                <Box>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {reportReason} - {reportCountry}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {formatDate(report.reportDate)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {t('reports.requestedBy')}: {report.requester}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {report.reimbursement_start_date && report.reimbursement_end_date 
                      ? `${formatDate(report.reimbursement_start_date)} - ${formatDate(report.reimbursement_end_date)}`
                      : `${formatDate(report.reportDate)} - ${formatDate(report.reportDate)}`
                    }
                  </Typography>
                </Box>
              </Box>
              <Chip
                label={getStatusLabel(report.status)}
                color={getStatusColor(report.status)}
                variant="filled"
                sx={{ fontSize: '0.875rem', fontWeight: 'bold' }}
              />
            </Box>
            
            {/* Action buttons for approvers - only show if report is in an approval stage and user has approval authority */}
            {!isAccountingUser && report?.status && ['SUPERVISOR_PENDING', 'TREASURY_PENDING', 'FUNDS_RETURN_PENDING', 'REVIEW_RETURN', 'APPROVED_FOR_REIMBURSEMENT'].includes(report.status.toUpperCase()) && (
              <Box display="flex" justifyContent="flex-end" gap={2}>
                <Button
                  onClick={handleReject}
                  color="error"
                  variant="outlined"
                  startIcon={<RejectIcon />}
                  disabled={submitting || loading}
                  size="medium"
                >
                  {t('common.reject')}
                </Button>
                <Button
                  onClick={handleApprove}
                  color="success"
                  variant="contained"
                  startIcon={<ApproveIcon />}
                  disabled={submitting || loading}
                  size="medium"
                >
                  {t('common.approve')}
                </Button>
              </Box>
            )}
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Two-column layout - matching reference */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Left Column - Resumen de Gastos */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2, height: 'fit-content' }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                {t('reports.expenseSummary')}
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>{t('common.category')}</strong></TableCell>
                      <TableCell align="center"><strong>{t('common.quantity')}</strong></TableCell>
                      <TableCell align="right"><strong>{t('common.amount')}</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categorySummary.map((category) => (
                      <TableRow key={category.category}>
                        <TableCell>{category.category}</TableCell>
                        <TableCell align="center">{category.count}</TableCell>
                        <TableCell align="right">
                          {category.currency} {category.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ backgroundColor: '#f0f0f0' }}>
                      <TableCell><strong>{t('reports.totalSpent')}</strong></TableCell>
                      <TableCell align="center"><strong>{expenses.length}</strong></TableCell>
                      <TableCell align="right">
                        <strong>{currencySymbol} {total.toLocaleString()}</strong>
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ backgroundColor: total > prepaidAmount ? '#ffebee' : '#fff3e0' }}>
                      <TableCell><strong>{t('reports.assignedBudget')}</strong></TableCell>
                      <TableCell align="center"><strong>1</strong></TableCell>
                      <TableCell align="right">
                        <strong>{currencySymbol} {prepaidAmount.toLocaleString()}</strong>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Right Column - Estado del Informe */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2, height: 'fit-content' }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                {t('reports.reportStatus')}
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>{t('common.information')}</strong></TableCell>
                      <TableCell align="right"><strong>{t('common.value')}</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>{t('common.status')}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={getStatusLabel(report.status)}
                          color={getStatusColor(report.status)}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{t('reports.assignedAmount')}</TableCell>
                      <TableCell align="right">
                        <Typography color="primary" fontWeight="bold">
                          {currencySymbol} {prepaidAmount.toLocaleString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{t('reports.spentAmount')}</TableCell>
                      <TableCell align="right">
                        {currencySymbol} {total.toLocaleString()}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{t('reports.budgetStatus')}</TableCell>
                      <TableCell align="right">
                        <Typography 
                          fontWeight="bold" 
                          color={total <= prepaidAmount ? "success.main" : "error.main"}
                        >
                          {total <= prepaidAmount ? t('reports.withinBudget') : t('reports.overBudget')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{t('reports.creationDate')}</TableCell>
                      <TableCell align="right">{formatDate(report.reportDate)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{t('reports.sendDate')}</TableCell>
                      <TableCell align="right">{formatDate(report.reportDate)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>

        {/* Expense Details - matching reference */}
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            {t('reports.expenseDetails')}
          </Typography>
          
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell width="50px">
                    <Typography variant="caption" color="textSecondary">
                      {t('common.expand')}
                    </Typography>
                  </TableCell>
                  <TableCell><strong>#</strong></TableCell>
                  <TableCell><strong>{t('reports.expenseType')}</strong></TableCell>
                  <TableCell><strong>{t('common.description')}</strong></TableCell>
                  <TableCell><strong>{t('reports.expenseDate')}</strong></TableCell>
                  <TableCell align="right"><strong>{t('common.amount')}</strong></TableCell>
                  <TableCell><strong>{t('common.status')}</strong></TableCell>
                  <TableCell><strong>{t('common.actions')}</strong></TableCell>
                  {isAccountingUser && <TableCell><strong>{t('reports.approval')}</strong></TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {expenses.map((expense, index) => (
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
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{expense.category_name}</TableCell>
                      <TableCell>{expense.purpose}</TableCell>
                      <TableCell>{expense.expense_date}</TableCell>
                      <TableCell align="right">
                        <strong>{expense.currency_code} {parseFloat(expense.amount).toLocaleString()}</strong>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getStatusLabel(expense.status || 'PENDING')} 
                          color={
                            expense.status === 'APPROVED' ? 'success' : 
                            expense.status === 'REJECTED' ? 'error' : 
                            'warning'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleViewExpense(expense)}
                          title={t('reports.viewDetails')}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </TableCell>
                      {isAccountingUser && (
                        <TableCell>
                          {expense.status === 'APPROVED' || expense.status === 'REJECTED' ? (
                            <Typography variant="caption" color="text.secondary">
                              {expense.status === 'APPROVED' ? t('common.approved') : t('common.rejected')}
                            </Typography>
                          ) : (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleExpenseApprove(expense.id)}
                                disabled={submitting}
                                title={t('reports.approveExpense')}
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
                                title={t('reports.rejectExpense')}
                              >
                                <CloseIcon />
                              </IconButton>
                            </Box>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                    
                    <TableRow>
                      <TableCell colSpan={isAccountingUser ? 9 : 8} sx={{ py: 0, border: 0 }}>
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
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Bottom info for accounting users */}
        {isAccountingUser && (
          <Box mt={3} textAlign="center">
            <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Approve or reject individual expenses above. The report will be automatically processed when all expenses are reviewed.
            </Typography>
          </Box>
        )}
      
      {/* Fund Return Document Section */}
      {(report.status === 'REVIEW_RETURN' || (report.return_document_number && report.return_document_files)) && (
        <Paper sx={{ borderRadius: 2, boxShadow: 1, mb: 3 }}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Fund Return Documents
            </Typography>
            
            {report.return_document_number && report.return_document_files && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Document Number: <strong>{report.return_document_number}</strong>
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Submitted Files:
                </Typography>
                
                {report.return_document_files.map((file: any, index: number) => (
                  <Box key={index} sx={{ ml: 2, mb: 1 }}>
                    <Typography 
                      variant="body2" 
                      component="span"
                      onClick={() => handleDownloadFile(file)}
                      sx={{ 
                        color: 'primary.main',
                        textDecoration: 'none',
                        cursor: 'pointer',
                        '&:hover': {
                          textDecoration: 'underline'
                        }
                      }}
                    >
                      📎 {file.original_name} ({(file.size / 1024).toFixed(1)} KB)
                    </Typography>
                  </Box>
                ))}
                

                
                {report.status === 'APPROVED_RETURNED_FUNDS' && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Fund return approved and processed.
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        </Paper>
      )}
      
      </Container>

      {/* Expense Detail Modal */}
      <ExpenseViewModal
        open={expenseDetailModal}
        onClose={() => setExpenseDetailModal(false)}
        expense={selectedExpense}
      />
    </Box>
  );
};

export default ReportApprovalPage;
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  IconButton,
  CircularProgress,
  Button,
  Grid,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Visibility as VisibilityIcon,
  Info as InfoIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import HistoryIcon from '@mui/icons-material/History';
import EntityHistoryModal from '../components/forms/EntityHistoryModal';
import apiClient from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import ExpenseViewModal from '../components/modals/ExpenseViewModal';
import FundReturnDocumentModal from '../components/modals/FundReturnDocumentModal';

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
  updated_at?: string;
}

interface ExpenseReport {
  id: number;
  prepaymentId: number;
  reportDate: string;
  totalExpenses: number;
  prepaidAmount: number;
  budgetStatus: string;
  status: string;
  requester: string;
  report_type: string;
  reimbursement_reason?: string;
  reimbursement_country?: string;
  reimbursement_start_date?: string;
  reimbursement_end_date?: string;
  prepayment_reason?: string;
  prepayment_destination?: string;
  currency: string;
  // SAP fields
  sap_compensation_number?: string;
  // Fund return fields
  return_document_number?: string;
  return_document_files?: Array<{
    original_name: string;
    stored_name: string;
    file_path: string;
    size: number;
  }>;
}

interface CategorySummary {
  category: string;
  count: number;
  amount: number;
  currency: string;
}

const ReportViewPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { reportId } = useParams<{ reportId: string }>();
  const { user } = useAuth();
  
  // State variables
  const [report, setReport] = useState<ExpenseReport | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [fundReturnModalOpen, setFundReturnModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  
  // ExpenseViewModal state
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
    tax_id?: number;
    tax_code?: string;
    tax_regime?: string;
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
        return 'success';
      case 'rejected':
        return 'error';
      case 'supervisor_pending':
      case 'accounting_pending':
      case 'treasury_pending':
      case 'funds_return_pending':
      case 'review_return':
        return 'warning';
      case 'approved_for_reimbursement':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatRejectionTooltip = (expense: Expense) => {
    if (expense.status.toLowerCase() !== 'rejected') {
      return null;
    }
    
    const rejectionDate = expense.updated_at 
      ? new Date(expense.updated_at).toLocaleString()
      : 'N/A';
    
    return (
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          {t('expenses.rejectionDate')}:
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {rejectionDate}
        </Typography>
        {expense.rejection_reason && (
          <>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              {t('expenses.rejectionReason')}:
            </Typography>
            <Typography variant="body2">
              {expense.rejection_reason}
            </Typography>
          </>
        )}
      </Box>
    );
  };

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
          sap_compensation_number: reportData.sap_compensation_number,
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
        
      } catch (error) {
        console.error('Error loading report data:', error);
        setError('Failed to load report data');
      } finally {
        setLoading(false);
      }
  };

  // Load report and expenses data on mount
  useEffect(() => {
    loadReportData();
  }, [reportId]);

  const handleViewExpense = (expense: Expense) => {
    const convertedExpense = {
      id: expense.id,
      category_id: (expense as any).category_id || 1,
      category: expense.category_name || 'Unknown',
      travel_expense_report_id: parseInt(reportId || '0'),
      travel_expense_report: (expense as any).travel_expense_report_name || report?.prepayment_reason || report?.reimbursement_reason || `Report ${reportId}`,
      purpose: expense.purpose,
      document_type: (expense as any).document_type || 'Factura',
      boleta_supplier: (expense as any).boleta_supplier,
      factura_supplier_id: (expense as any).factura_supplier_id,
      factura_supplier: (expense as any).factura_supplier_name || (expense as any).factura_supplier,
      factura_supplier_name: (expense as any).factura_supplier_name,
      expense_date: expense.expense_date,
      country_id: (expense as any).country_id || 1,
      country: (expense as any).country_name || 'Unknown',
      country_name: (expense as any).country_name,
      currency: expense.currency_code,
      currency_code: expense.currency_code,
      amount: parseFloat(expense.amount),
      document_number: (expense as any).document_number || 'N/A',
      taxable: (expense as any).taxable || 'No',
      tax_id: (expense as any).tax_id,
      tax_code: (expense as any).tax_code,
      tax_regime: (expense as any).tax_regime,
      document_file: (expense as any).document_file,
      comments: (expense as any).comments || expense.rejection_reason || undefined,
      status: (expense.status.toLowerCase() === 'rejected' ? 'pending' : expense.status.toLowerCase()) as 'pending' | 'in_process' | 'approved'
    };
    setSelectedExpense(convertedExpense);
    setExpenseDetailModal(true);
  };

  const handleSubmitForApproval = async () => {
    if (!reportId) return;
    
    setSubmitting(true);
    try {
      await apiClient.post(`/approvals/reports/${reportId}/submit`);
      
      // Refresh the report data
      const reportResponse = await apiClient.get(`/expense-reports/${reportId}`);
      const reportData = reportResponse.data;
      
      const updatedReport: ExpenseReport = {
        id: reportData.id,
        prepaymentId: reportData.prepayment_id,
        reportDate: reportData.created_at,
        totalExpenses: Number(reportData.total_expenses) || 0,
        prepaidAmount: Number(reportData.prepayment_amount) || 0,
        budgetStatus: reportData.budget_status || 'PENDING',
        status: reportData.status || 'PENDING',
        requester: reportData.requesting_user?.name && reportData.requesting_user?.surname 
          ? `${reportData.requesting_user.name} ${reportData.requesting_user.surname}`
          : reportData.requesting_user?.email || 'N/A',
        report_type: reportData.report_type || (reportData.prepayment_id ? 'PREPAYMENT' : 'REIMBURSEMENT'),
        reimbursement_reason: reportData.reimbursement_reason,
        reimbursement_country: reportData.reimbursement_country,
        reimbursement_start_date: reportData.reimbursement_start_date,
        reimbursement_end_date: reportData.reimbursement_end_date,
        prepayment_reason: reportData.prepayment_reason,
        prepayment_destination: reportData.prepayment_destination,
        currency: reportData.currency,
      };
      
      setReport(updatedReport);
    } catch (error) {
      console.error('Error submitting report:', error);
      setError('Failed to submit report for approval');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFundReturnSubmission = async (documentNumber: string, files: File[]) => {
    if (!reportId) return;
    
    const formData = new FormData();
    formData.append('document_number', documentNumber);
    
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    try {
      await apiClient.post(`/approvals/reports/${reportId}/submit-return-documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Refresh the report data to show updated status
      await loadReportData();
      
    } catch (error: any) {
      console.error('Error submitting fund return documents:', error);
      throw new Error(error.response?.data?.detail || 'Failed to submit documents');
    }
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

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!report) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography color="error">Report not found</Typography>
      </Container>
    );
  }

  const categorySummary = getCategorySummary();
  const total = categorySummary.reduce((sum, item) => sum + item.amount, 0);
  
  // Get report reason and country from the correct fields - matching ReportApprovalPage logic
  const reportReason = report.report_type === 'REIMBURSEMENT' 
    ? (report.reimbursement_reason || 'N/A')
    : (report.prepayment_reason || 'N/A');
  const reportCountry = report.report_type === 'REIMBURSEMENT' 
    ? (report.reimbursement_country || 'N/A')
    : (report.prepayment_destination || 'N/A');

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Paper sx={{ 
        borderRadius: 2, 
        boxShadow: 1, 
        mb: 3,
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <Box sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box display="flex" alignItems="flex-start" gap={2}>
              <IconButton 
                onClick={() => navigate('/reports')} 
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
            <Box display="flex" alignItems="center" gap={1}>
              <Chip
              label={getStatusLabel(report.status)}
              color={getStatusColor(report.status)}
              variant="filled"
              sx={{ fontSize: '0.875rem', fontWeight: 'bold' }}
              />
              <Button variant="text" startIcon={<HistoryIcon />} onClick={() => setHistoryOpen(true)}>
                {t('common.history')}
              </Button>
            </Box>
          </Box>
          
          {/* Submit for Approval button - only show if report is in PENDING status */}
          {report.status.toLowerCase() === 'pending' && (
            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button
                onClick={handleSubmitForApproval}
                color="primary"
                variant="contained"
                startIcon={<SendIcon />}
                disabled={submitting || expenses.length === 0}
                size="medium"
              >
                {submitting ? <CircularProgress size={20} /> : t('reports.submitForApproval')}
              </Button>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Two-column layout */}
      <Grid container spacing={3}>
        {/* Left column - Expense Summary */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 1 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {t('reports.expenseSummary')}
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>{t('common.category')}</strong></TableCell>
                  <TableCell align="center"><strong>{t('common.quantity')}</strong></TableCell>
                  <TableCell align="right"><strong>{t('common.amount')}</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categorySummary.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.category}</TableCell>
                    <TableCell align="center">{item.count}</TableCell>
                    <TableCell align="right">{item.currency} {item.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ borderTop: 2, borderColor: 'divider', backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>{t('reports.totalSpent')}</strong></TableCell>
                  <TableCell align="center"><strong>{categorySummary.length}</strong></TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold" color="primary.main">
                      {report.currency} {total.toFixed(2)}
                    </Typography>
                  </TableCell>
                </TableRow>
                <TableRow sx={{ 
                  backgroundColor: total > report.prepaidAmount ? '#ffebee' : '#e8f5e8' 
                }}>
                  <TableCell><strong>{t('reports.assignedBudget')}</strong></TableCell>
                  <TableCell align="center"><strong>1</strong></TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold">
                      {report.currency} {Number(report.prepaidAmount || 0).toFixed(2)}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        {/* Right column - Report Status */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 1 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {t('reports.reportStatus')}
            </Typography>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell><strong>{t('common.status')}</strong></TableCell>
                  <TableCell align="right">
                    <Chip
                      label={getStatusLabel(report.status)}
                      color={getStatusColor(report.status)}
                      variant="filled"
                      size="small"
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>{t('reports.assignedAmount')}</strong></TableCell>
                  <TableCell align="right">
                    <Typography color="primary.main" fontWeight="bold">
                      {report.currency} {Number(report.prepaidAmount || 0).toFixed(2)}
                    </Typography>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>{t('reports.spentAmount')}</strong></TableCell>
                  <TableCell align="right">{report.currency} {total.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>{t('reports.budgetStatus')}</strong></TableCell>
                  <TableCell align="right">
                    <Typography 
                      fontWeight="bold" 
                      color={total > report.prepaidAmount ? 'error.main' : 'success.main'}
                    >
                      {total > report.prepaidAmount ? t('reports.overBudget') : t('reports.withinBudget')}
                    </Typography>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>{t('reports.creationDate')}</strong></TableCell>
                  <TableCell align="right">{formatDate(report.reportDate)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>{t('reports.sendDate')}</strong></TableCell>
                  <TableCell align="right">{formatDate(report.reportDate)}</TableCell>
                </TableRow>
                {/* SAP Compensation Number - show for all users when it exists */}
                {report.sap_compensation_number && (
                  <TableRow>
                    <TableCell><strong>{t('accounting.sapCompensationNumber')}</strong></TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="bold" color="primary.main">
                        {report.sap_compensation_number}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>

      {/* Expense Details */}
      <Paper sx={{ mt: 3, borderRadius: 2, boxShadow: 1 }}>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            {t('reports.expenseDetails')}
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>#</strong></TableCell>
                  <TableCell><strong>{t('reports.expenseType')}</strong></TableCell>
                  <TableCell><strong>{t('common.description')}</strong></TableCell>
                  <TableCell><strong>{t('reports.expenseDate')}</strong></TableCell>
                  <TableCell><strong>{t('common.amount')}</strong></TableCell>
                  <TableCell><strong>{t('common.status')}</strong></TableCell>
                  <TableCell><strong>{t('common.actions')}</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary">
                        No expenses added yet
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense, index) => (
                    <TableRow 
                      key={expense.id}
                      sx={{
                        backgroundColor: expense.status.toLowerCase() === 'approved' ? '#e8f5e8' : 
                                       expense.status.toLowerCase() === 'rejected' ? '#ffebee' : 'transparent'
                      }}
                    >
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{expense.category_name}</TableCell>
                      <TableCell>{expense.purpose}</TableCell>
                      <TableCell>{formatDate(expense.expense_date)}</TableCell>
                      <TableCell>{expense.currency_code} {expense.amount}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip
                            label={getStatusLabel(expense.status)}
                            color={expense.status.toLowerCase() === 'approved' ? 'success' : 
                                  expense.status.toLowerCase() === 'rejected' ? 'error' : 'warning'}
                            variant="filled"
                            size="small"
                          />
                          {expense.status.toLowerCase() === 'rejected' && (
                            <Tooltip 
                              title={formatRejectionTooltip(expense)}
                              placement="top"
                              arrow
                            >
                              <InfoIcon 
                                fontSize="small" 
                                color="error"
                                sx={{ cursor: 'pointer' }}
                              />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => handleViewExpense(expense)}
                          size="small"
                          title={t('reports.viewDetails')}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>

      {/* Fund Return Document Section */}
      {(report.status === 'FUNDS_RETURN_PENDING' || (report.return_document_number && report.return_document_files)) && (
        <Paper sx={{ borderRadius: 2, boxShadow: 1, mb: 3, mt: 4 }}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('reports.fundReturnDocuments')}
            </Typography>
            
            {report.status === 'FUNDS_RETURN_PENDING' && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('reports.submitSupportingDocuments')}
                </Typography>
                
                <Alert severity="info" sx={{ mb: 3 }}>
                  {t('reports.needToSubmitDocuments')}
                </Alert>
                
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SendIcon />}
                  onClick={() => setFundReturnModalOpen(true)}
                >
                  Submit Return Documents
                </Button>
              </Box>
            )}
            
            {report.return_document_number && report.return_document_files && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
{t('expenses.documentNumber')}: <strong>{report.return_document_number}</strong>
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
{t('reports.submittedFiles')}:
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
                
                {report.status === 'REVIEW_RETURN' && (
                  <Alert severity="info" sx={{ mt: 2 }}>
{t('reports.documentsSubmittedReview')}
                  </Alert>
                )}
                
                {report.status === 'APPROVED_RETURNED_FUNDS' && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    {t('reports.fundReturnApproved')}
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {/* Expense Detail Modal */}
      {selectedExpense && (
        <ExpenseViewModal
          open={expenseDetailModal}
          expense={selectedExpense}
          onClose={() => {
            setExpenseDetailModal(false);
            setSelectedExpense(undefined);
          }}
        />
      )}

      {/* Fund Return Document Modal */}
      <FundReturnDocumentModal
        open={fundReturnModalOpen}
        onClose={() => setFundReturnModalOpen(false)}
        onSubmit={handleFundReturnSubmission}
        reportId={parseInt(reportId || '0')}
      />

      {/* Entity History Modal for Report */}
      <EntityHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entityType="report"
        entityId={report?.id || null}
      />
      </Container>
    </Box>
  );
};

export default ReportViewPage;

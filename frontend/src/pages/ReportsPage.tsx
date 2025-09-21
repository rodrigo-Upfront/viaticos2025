import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Grid,
  Card,
  CardContent,
  Snackbar,
  Alert,
  CircularProgress,
  Checkbox,
  ListItemText,
  OutlinedInput,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Visibility as ViewIcon,
  FileDownload as FileDownloadIcon,
  Add as AddIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
  PendingActions as PendingActionsIcon,
  Undo as UndoIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

import ConfirmDialog from '../components/forms/ConfirmDialog';
import { reportService, ExpenseReport as ApiReport, ExpenseReportSummary, ExpenseReportManualCreate } from '../services/reportService';
import { countryService, Country as ApiCountry } from '../services/countryService';
import { currencyService, Currency } from '../services/currencyService';
import apiClient from '../services/apiClient';

interface ExpenseReport {
  id: number;
  prepaymentId: number;
  reportDate: string;
  totalExpenses: number;
  prepaidAmount: number;
  budgetStatus: string;
  status: string;
  expenseCount: number;
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

const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ReactNode;
  bgColor: string;
  barColor: string;
  onClick?: () => void;
  percentage?: number;
}> = ({ title, value, icon, bgColor, barColor, onClick, percentage = 0 }) => (
  <Card sx={{ 
    height: '100%', 
    backgroundColor: bgColor,
    position: 'relative',
    overflow: 'visible',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 4,
    cursor: onClick ? 'pointer' : 'default',
    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
    '&:hover': onClick ? {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    } : {}
  }}
  onClick={onClick}
  >
    <CardContent sx={{ p: 3 }}>
      {/* Header with Icon */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="body1" sx={{ color: '#666', fontWeight: 500, fontSize: '0.9rem' }}>
          {title}
        </Typography>
        <Box sx={{ fontSize: 24, color: barColor }}>
          {icon}
        </Box>
      </Box>

      {/* Main Value */}
      <Typography variant="h4" component="div" fontWeight="bold" sx={{ mb: 1, color: '#333' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Typography>

      {/* Accent Bar */}
      <Box sx={{
        width: '100%',
        height: 4,
        backgroundColor: 'rgba(0,0,0,0.06)',
        borderRadius: 2,
        overflow: 'hidden'
      }}>
        <Box sx={{
          width: `${Math.min(100, Math.max(0, percentage))}%`,
          height: '100%',
          backgroundColor: barColor,
          borderRadius: 2,
          transition: 'width 0.3s ease-in-out'
        }} />
      </Box>
    </CardContent>
  </Card>
);

const ReportsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Loading state
  const [loading, setLoading] = useState({
    reports: true,
    summary: true,
    action: false,
  });

  // Data state
  const [expenseReports, setExpenseReports] = useState<ExpenseReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<ExpenseReport[]>([]);
  const [summary, setSummary] = useState<ExpenseReportSummary | null>(null);
  const [countries, setCountries] = useState<{ id: number; name: string }[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [filterOptions, setFilterOptions] = useState<{
    statuses: string[];
    countries: Array<{id: number; name: string}>;
    budget_statuses: string[];
    types: string[];
  }>({
    statuses: [],
    countries: [],
    budget_statuses: [],
    types: []
  });

  // Search state
  const [searchFilters, setSearchFilters] = useState({
    reason: '',
    country: '',
    budgetStatus: '',
    type: '',
    status: [] as string[], // Changed to array for multiple selection
  });

  // User filter state (for accounting/treasury users)
  const { user } = useAuth();
  const [filterUserId, setFilterUserId] = useState<number | ''>(user?.id || '');
  const [availableUsers, setAvailableUsers] = useState<{id: number, name: string, email: string, profile: string}[]>([]);
  
  // Check if user can filter by other users
  const canFilterByUser = user?.profile === 'ACCOUNTING' || user?.profile === 'TREASURY' || user?.is_superuser;

  // Load data on component mount
  useEffect(() => {
    loadReports();
    loadSummary();
    loadCountries();
    loadCurrencies();
    loadFilterOptions();
    if (canFilterByUser) {
      loadAvailableUsers();
    }
  }, [canFilterByUser]);

  // Reload reports when user filter changes
  useEffect(() => {
    if (canFilterByUser) {
      loadReports();
    }
  }, [filterUserId, canFilterByUser]);

  // Filter reports based on search criteria
  useEffect(() => {
    let filtered = expenseReports;

    if (searchFilters.reason) {
      filtered = filtered.filter(report => {
        const reason = report.report_type === 'REIMBURSEMENT' 
          ? report.reimbursement_reason 
          : report.prepayment_reason;
        return reason?.toLowerCase().includes(searchFilters.reason.toLowerCase());
      });
    }

    if (searchFilters.country) {
      filtered = filtered.filter(report => {
        const country = report.report_type === 'REIMBURSEMENT' 
          ? report.reimbursement_country 
          : report.prepayment_destination;
        return country?.toLowerCase().includes(searchFilters.country.toLowerCase());
      });
    }

    if (searchFilters.budgetStatus) {
      filtered = filtered.filter(report => 
        report.budgetStatus?.toLowerCase().includes(searchFilters.budgetStatus.toLowerCase())
      );
    }

    if (searchFilters.type) {
      filtered = filtered.filter(report => 
        (report.report_type || 'PREPAYMENT').toLowerCase().includes(searchFilters.type.toLowerCase())
      );
    }

    if (searchFilters.status.length > 0) {
      filtered = filtered.filter(report => 
        searchFilters.status.some(status => 
          report.status.toUpperCase().includes(status.toUpperCase())
        )
      );
    }

    setFilteredReports(filtered);
  }, [expenseReports, searchFilters]);

  // Helper function to map API report to frontend format
  const mapApiToFrontend = (apiReport: ApiReport): ExpenseReport => {
    return {
      id: apiReport.id,
      prepaymentId: (apiReport as any).prepayment_id || 0,
      reportDate: apiReport.created_at.split('T')[0], // Extract date part
      totalExpenses: parseFloat(apiReport.total_expenses || '0'),
      prepaidAmount: parseFloat(apiReport.prepayment_amount || '0'),
      budgetStatus: (parseFloat(apiReport.total_expenses || '0') > parseFloat(apiReport.prepayment_amount || '0')) ? 'Over-Budget' : 'Under-Budget',
      status: apiReport.status,
      expenseCount: (apiReport as any).expense_count || 0,
      // Include reimbursement-specific fields
      report_type: (apiReport as any).report_type,
      reimbursement_reason: (apiReport as any).reimbursement_reason,
      reimbursement_country: (apiReport as any).reimbursement_country,
      reimbursement_start_date: (apiReport as any).start_date,
      reimbursement_end_date: (apiReport as any).end_date,
      prepayment_reason: (apiReport as any).prepayment_reason,
      prepayment_destination: (apiReport as any).prepayment_destination,
      currency: (apiReport as any).currency,  // Unified currency field
    };
  };

  // Load reports from API
  const loadReports = async () => {
    try {
      setLoading(prev => ({ ...prev, reports: true }));
      const response = await reportService.getReports({
        // Only send user_id filter if user has permission to filter by user
        ...(canFilterByUser && filterUserId ? { user_id: filterUserId as number } : {} as any),
      });
      const mappedReports = response.reports.map(mapApiToFrontend);
      
      // Debug: Log actual status values from API vs what we're filtering for
      console.log('=== DEBUGGING STATUS VALUES ===');
      console.log('Raw API response statuses:', response.reports.map(r => ({ id: r.id, status: r.status })));
      console.log('Mapped report statuses:', mappedReports.map(r => ({ id: r.id, status: r.status })));
      
      // Check what each card should show
      const pendingCount = mappedReports.filter(r => 
        ['PENDING', 'REJECTED'].includes(r.status.toUpperCase())
      ).length;
      const approvalCount = mappedReports.filter(r => 
        ['SUPERVISOR_PENDING', 'ACCOUNTING_PENDING', 'TREASURY_PENDING'].includes(r.status.toUpperCase())
      ).length;
      const returnCount = mappedReports.filter(r => r.status.toUpperCase() === 'FUNDS_RETURN_PENDING').length;
      
      console.log('Card counts should be:');
      console.log('- Pending Submit (PENDING + REJECTED):', pendingCount, `(${mappedReports.length > 0 ? ((pendingCount / mappedReports.length) * 100).toFixed(1) : 0}%)`);
      console.log('- Pending Approval (SUPERVISOR_PENDING, ACCOUNTING_PENDING, TREASURY_PENDING):', approvalCount, `(${mappedReports.length > 0 ? ((approvalCount / mappedReports.length) * 100).toFixed(1) : 0}%)`);
      console.log('- Pending Return (FUNDS_RETURN_PENDING):', returnCount, `(${mappedReports.length > 0 ? ((returnCount / mappedReports.length) * 100).toFixed(1) : 0}%)`);
      console.log('- Total reports:', mappedReports.length);
      console.log('- All unique statuses found:', Array.from(new Set(mappedReports.map(r => r.status))));
      
      setExpenseReports(mappedReports);
      setFilteredReports(mappedReports);
    } catch (error) {
      console.error('Failed to load expense reports:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load expense reports',
        severity: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, reports: false }));
    }
  };

  // Load countries and currencies
  const loadCountries = async () => {
    try {
      const response = await countryService.getCountries();
      const mapped = response.map((c: ApiCountry) => ({ id: c.id, name: c.name }));
      setCountries(mapped);
    } catch (e) {
      // ignore optional load errors
    }
  };

  const loadCurrencies = async () => {
    try {
      const data = await currencyService.getCurrencies();
      setCurrencies(data);
    } catch (e) {
      // ignore optional load errors
    }
  };

  // Load filter options from API
  const loadFilterOptions = async () => {
    try {
      const options = await reportService.getFilterOptions();
      setFilterOptions(options);
    } catch (error) {
      console.error('Failed to load filter options:', error);
      // Don't show error for filter options, fallback to empty arrays
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const users = await reportService.getUsersForFilter();
      setAvailableUsers(users);
    } catch (error) {
      console.error('Failed to load available users:', error);
      // If user doesn't have permission, this will fail silently
    }
  };

  // Load summary from API
  const loadSummary = async () => {
    try {
      setLoading(prev => ({ ...prev, summary: true }));
      const summaryData = await reportService.getReportsSummary();
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load reports summary:', error);
    } finally {
      setLoading(prev => ({ ...prev, summary: false }));
    }
  };

  const getBudgetStatusColor = (status: string) => {
    return status === 'Under-Budget' ? 'success' : 'error';
  };

  const getBudgetStatusLabel = (status: string) => {
    return status === 'Under-Budget' ? t('reports.withinBudget') : t('reports.overBudget');
  };

  const REPORT_STATUS_LABELS: Record<string, { en: string; es: string }> = {
    pending: { en: "Pending Submit", es: "Pendiente Rendición de Gastos" },
    supervisor_pending: { en: "Supervisor Review", es: "Revisión Jefatura" },
    accounting_pending: { en: "Accounting Review", es: "Revisión Contabilidad" },
    treasury_pending: { en: "Treasury Review", es: "Revisión Tesorería" },
    approved_for_reimbursement: { en: "Approved for Reimbursement", es: "Aprobado para Reembolso" },
    funds_return_pending: { en: "Funds Return Pending", es: "Pendiente de Devolución" },
    review_return: { en: "Fund return review", es: "Revisar Doc. Devolución" },
    approved: { en: "Approved", es: "Aprobado" },
    approved_expenses: { en: "Expenses Approved", es: "Gastos Aprobados" },
    approved_repaid: { en: "Trip Reimbursed", es: "Viaje Reembolsado" },
    approved_returned_funds: { en: "Refund completed", es: "Devolución realizada" },
    rejected: { en: "Rejected", es: "Rechazado" },
  };

  const getStatusLabel = (status: string) => {
    const lang = i18n.language?.startsWith('es') ? 'es' : 'en';
    const entry = REPORT_STATUS_LABELS[status.toLowerCase()];
    return entry ? entry[lang] : status;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'default';
      case 'supervisor_pending':
      case 'accounting_pending':
      case 'treasury_pending':
        return 'warning';
      case 'approved_for_reimbursement':
        return 'info';
      case 'funds_return_pending':
      case 'review_return':
        return 'warning'; // Orange for intermediate statuses
      case 'approved':
      case 'approved_expenses':
      case 'approved_repaid':
      case 'approved_returned_funds':
        return 'success'; // Green for all approved types
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };







  const getReportTypeLabel = (reportType?: string) => {
    if (reportType === 'REIMBURSEMENT') {
      return t('approvals.types.reimbursement');
    }
    return t('approvals.types.expenseReport');
  };

  const handleViewReport = (report: typeof expenseReports[0]) => {
    navigate(`/reports/view/${report.id}`);
  };

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

  // Create reimbursement dialog
  const [createDialog, setCreateDialog] = useState({
    open: false,
    reason: '',
    country_id: 0,
    currency_id: 0,
    start_date: '',
    end_date: '',
  });

  const handleSendForApproval = async (report: ExpenseReport) => {
    if (report.status.toLowerCase() !== 'pending' && report.status.toLowerCase() !== 'rejected') {
      setSnackbar({
        open: true,
        message: 'Only pending or rejected reports can be sent for approval',
        severity: 'warning'
      });
      return;
    }

    // Check if report has expenses
    if (report.expenseCount === 0) {
      setSnackbar({
        open: true,
        message: 'Cannot submit report for approval without expenses. Please add at least one expense before submitting.',
        severity: 'warning'
      });
      return;
    }

    try {
      setLoading(prev => ({ ...prev, action: true }));
      
      const response = await apiClient.post(`/approvals/reports/${report.id}/submit`);

      setSnackbar({
        open: true,
        message: 'Report submitted for approval successfully',
        severity: 'success'
      });
      
      // Reload reports to show updated status
      await Promise.all([loadReports(), loadSummary(), loadFilterOptions()]);
      
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to submit report for approval',
        severity: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  };




  const handleGenerateReport = () => {
    // Placeholder for generate report functionality
    setSnackbar({
      open: true,
      message: 'Generate Report functionality not yet implemented. In production, this would create a comprehensive PDF report with charts and summaries.',
      severity: 'info'
    });
    
    // Simulate PDF generation
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = '#'; // This would be the actual PDF URL from backend
      link.download = `expense-summary-report-${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
    }, 1500);
  };

  const openCreateReimbursement = async () => {
    await Promise.all([loadCountries(), loadCurrencies()]);
    setCreateDialog({ open: true, reason: '', country_id: 0, currency_id: 0, start_date: '', end_date: '' });
  };

  const handleCreateReimbursement = async () => {
    if (!createDialog.reason.trim() || !createDialog.country_id || !createDialog.currency_id || !createDialog.start_date || !createDialog.end_date) {
      setSnackbar({ open: true, message: 'All fields are required', severity: 'warning' });
      return;
    }
    if (new Date(createDialog.start_date) > new Date(createDialog.end_date)) {
      setSnackbar({ open: true, message: 'End date must be on or after start date', severity: 'warning' });
      return;
    }
    try {
      setLoading(prev => ({ ...prev, action: true }));
      const payload: ExpenseReportManualCreate = {
        reason: createDialog.reason.trim(),
        country_id: createDialog.country_id,
        currency_id: createDialog.currency_id,
        start_date: createDialog.start_date,
        end_date: createDialog.end_date,
      };
      await reportService.createManualReport(payload);
      setCreateDialog(prev => ({ ...prev, open: false }));
      setSnackbar({ open: true, message: 'Reimbursement report created successfully', severity: 'success' });
      await Promise.all([loadReports(), loadSummary(), loadFilterOptions()]);
    } catch (error: any) {
      setSnackbar({ open: true, message: error?.response?.data?.detail || 'Failed to create reimbursement', severity: 'error' });
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          {t('navigation.reports')}
        </Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateReimbursement}
            sx={{ mr: 2 }}
          >
{t('reports.createReimbursement')}
          </Button>
          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={handleGenerateReport}
          >
{t('reports.generateReport')}
          </Button>
        </Box>
      </Box>

      {/* Status Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={4} md={4}>
          <StatCard
            title={t('reports.pendingSubmit')}
            value={loading.reports ? '-' : (() => {
              const count = expenseReports.filter(r => 
                ['PENDING', 'REJECTED'].includes(r.status.toUpperCase())
              ).length;
              return count;
            })()}
            icon={<AssignmentIcon />}
            bgColor="#fef7f7"
            barColor="#e74c3c"
            percentage={loading.reports ? 0 : (() => {
              const count = expenseReports.filter(r => 
                ['PENDING', 'REJECTED'].includes(r.status.toUpperCase())
              ).length;
              return expenseReports.length > 0 ? (count / expenseReports.length) * 100 : 0;
            })()}
            onClick={() => {
              setSearchFilters(prev => ({ ...prev, status: ['PENDING', 'REJECTED'] }));
            }}
          />
        </Grid>
        <Grid item xs={12} sm={4} md={4}>
          <StatCard
            title={t('reports.pendingApproval')}
            value={loading.reports ? '-' : (() => {
              const count = expenseReports.filter(r => 
                ['SUPERVISOR_PENDING', 'ACCOUNTING_PENDING', 'TREASURY_PENDING'].includes(r.status.toUpperCase())
              ).length;
              return count;
            })()}
            icon={<PendingActionsIcon />}
            bgColor="#fefbf3"
            barColor="#f39c12"
            percentage={loading.reports ? 0 : (() => {
              const count = expenseReports.filter(r => 
                ['SUPERVISOR_PENDING', 'ACCOUNTING_PENDING', 'TREASURY_PENDING'].includes(r.status.toUpperCase())
              ).length;
              return expenseReports.length > 0 ? (count / expenseReports.length) * 100 : 0;
            })()}
            onClick={() => {
              setSearchFilters(prev => ({ ...prev, status: ['SUPERVISOR_PENDING', 'ACCOUNTING_PENDING', 'TREASURY_PENDING'] }));
            }}
          />
        </Grid>
        <Grid item xs={12} sm={4} md={4}>
          <StatCard
            title={t('reports.pendingReturn')}
            value={loading.reports ? '-' : (() => {
              const count = expenseReports.filter(r => r.status.toUpperCase() === 'FUNDS_RETURN_PENDING').length;
              return count;
            })()}
            icon={<UndoIcon />}
            bgColor="#f7fdf9"
            barColor="#27ae60"
            percentage={loading.reports ? 0 : (() => {
              const count = expenseReports.filter(r => r.status.toUpperCase() === 'FUNDS_RETURN_PENDING').length;
              return expenseReports.length > 0 ? (count / expenseReports.length) * 100 : 0;
            })()}
            onClick={() => {
              setSearchFilters(prev => ({ ...prev, status: ['FUNDS_RETURN_PENDING'] }));
            }}
          />
        </Grid>
      </Grid>

      {/* Search Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {t('reports.searchAndFilter')}
        </Typography>
        <Grid container spacing={2}>
          {/* User filter - only for accounting/treasury users */}
          {canFilterByUser && (
            <Grid item xs={6} sm={4} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('common.user')}</InputLabel>
                <Select
                  value={filterUserId}
                  label={t('common.user')}
                  onChange={(e) => setFilterUserId(e.target.value as number | '')}
                >
                  <MenuItem value={user?.id}>{t('common.myRecords')}</MenuItem>
                  {availableUsers.map(u => (
                    <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          
          <Grid item xs={6} sm={4} md={2}>
            <TextField
              fullWidth
              label={t('reports.reason')}
              value={searchFilters.reason}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, reason: e.target.value }))}
              size="small"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('common.status')}</InputLabel>
              <Select
                multiple
                value={searchFilters.status}
                onChange={(e) => {
                  const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                  setSearchFilters(prev => ({ ...prev, status: value }));
                }}
                input={<OutlinedInput label={t('common.status')} />}
                renderValue={(selected) => {
                  if (selected.length === 0) {
                    return <em>All</em>;
                  }
                  if (selected.length === 1) {
                    return getStatusLabel(selected[0]);
                  }
                  return `${selected.length} selected`;
                }}
              >
                {filterOptions.statuses.map(status => (
                  <MenuItem key={status} value={status}>
                    <Checkbox checked={searchFilters.status.indexOf(status) > -1} />
                    <ListItemText primary={getStatusLabel(status)} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('common.country')}</InputLabel>
              <Select
                value={searchFilters.country}
                label={t('common.country')}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, country: e.target.value }))}
              >
                <MenuItem value=""><em>All</em></MenuItem>
                {filterOptions.countries.map(country => (
                  <MenuItem key={country.id} value={country.name}>{country.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('reports.budgetStatus')}</InputLabel>
              <Select
                value={searchFilters.budgetStatus}
                label={t('reports.budgetStatus')}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, budgetStatus: e.target.value }))}
              >
                <MenuItem value=""><em>All</em></MenuItem>
                {filterOptions.budget_statuses.map(status => (
                  <MenuItem key={status} value={status}>{status.replace('_', ' ')}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={searchFilters.type}
                label="Type"
                onChange={(e) => setSearchFilters(prev => ({ ...prev, type: e.target.value }))}
              >
                <MenuItem value=""><em>All</em></MenuItem>
                {filterOptions.types.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>{t('tables.type')}</TableCell>
              <TableCell>{t('reports.reason')}</TableCell>
              <TableCell>{t('reports.reportDate')}</TableCell>
              <TableCell>{t('reports.totalExpenses')}</TableCell>
              <TableCell>{t('reports.prepaidAmount')}</TableCell>
              <TableCell>{t('reports.budgetStatus')}</TableCell>
              <TableCell>{t('common.status')}</TableCell>
              <TableCell>{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading.reports ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Loading expense reports...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No expense reports found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>{report.id}</TableCell>
                  <TableCell>
                    <Chip
                      label={getReportTypeLabel(report.report_type)}
                      color={report.report_type === 'REIMBURSEMENT' ? 'secondary' : 'primary'}
                      size="small"
                      variant="filled"
                    />
                  </TableCell>
                  <TableCell>
                    {report.report_type === 'REIMBURSEMENT' 
                      ? (report.reimbursement_reason || 'N/A')
                      : (report.prepayment_reason || 'N/A')
                    }
                  </TableCell>
                  <TableCell>{report.reportDate}</TableCell>
                  <TableCell>
                    {(report.currency || '$')}{report.totalExpenses.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {report.report_type === 'REIMBURSEMENT' 
                      ? '-' 
                      : `${report.currency || '$'}${report.prepaidAmount.toLocaleString()}`
                    }
                  </TableCell>
                  <TableCell>
                    {report.report_type === 'REIMBURSEMENT' ? (
                      <Chip label="-" size="small" variant="outlined" />
                    ) : (
                      <Chip
                        label={getBudgetStatusLabel(report.budgetStatus)}
                        color={getBudgetStatusColor(report.budgetStatus) as any}
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(report.status)}
                      color={getStatusColor(report.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleViewReport(report)}
                      color="info"
                      disabled={loading.action}
                    >
                      <ViewIcon />
                    </IconButton>
                    {(report.status.toLowerCase() === 'pending' || report.status.toLowerCase() === 'rejected') && (
                      <IconButton
                        size="small"
                        onClick={() => handleSendForApproval(report)}
                        color="success"
                        title={
                          report.expenseCount === 0
                            ? "Cannot send for approval: No expenses added" 
                            : report.status.toLowerCase() === 'rejected' 
                              ? "Resubmit for Approval"
                              : "Send for Approval"
                        }
                        disabled={loading.action || report.expenseCount === 0}
                      >
                        <SendIcon />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSnackbar({
                          open: true,
                          message: `Download individual report functionality not yet implemented. In production, this would download report #${report.id} as PDF.`,
                          severity: 'info'
                        });
                      }}
                      color="primary"
                      disabled={loading.action}
                    >
                      <DownloadIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>





      {/* Create Reimbursement Dialog */}
      <Dialog open={createDialog.open} onClose={() => setCreateDialog(prev => ({ ...prev, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle>{t('reports.createReimbursementReport')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label={t('reports.reason')}
            value={createDialog.reason}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateDialog(prev => ({ ...prev, reason: e.target.value }))}
            margin="normal"
            required
          />
          <FormControl fullWidth margin="normal" required>
            <InputLabel>{t('common.country')}</InputLabel>
            <Select
              value={createDialog.country_id}
              label={t('common.country')}
              onChange={(e: any) => setCreateDialog(prev => ({ ...prev, country_id: e.target.value }))}
            >
              <MenuItem value={0}><em>{t('reports.selectCountry')}</em></MenuItem>
              {countries.map(c => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>{t('common.currency')}</InputLabel>
            <Select
              value={createDialog.currency_id}
              label={t('common.currency')}
              onChange={(e: any) => setCreateDialog(prev => ({ ...prev, currency_id: e.target.value }))}
            >
              <MenuItem value={0}><em>{t('reports.selectCurrency')}</em></MenuItem>
              {currencies.map(c => (
                <MenuItem key={c.id} value={c.id}>{c.code} - {c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label={t('reports.startDate')}
            type="date"
            value={createDialog.start_date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateDialog(prev => ({ ...prev, start_date: e.target.value }))}
            margin="normal"
            required
            InputLabelProps={{
              shrink: true,
            }}
          />
          <TextField
            fullWidth
            label={t('reports.endDate')}
            type="date"
            value={createDialog.end_date}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateDialog(prev => ({ ...prev, end_date: e.target.value }))}
            margin="normal"
            required
            InputLabelProps={{
              shrink: true,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(prev => ({ ...prev, open: false }))} color="inherit" disabled={loading.action}>
{t('reports.cancel')}
          </Button>
          <Button onClick={handleCreateReimbursement} variant="contained" disabled={loading.action}>
{loading.action ? 'Creating...' : t('reports.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        severity="warning"
        confirmText="Send for Approval"
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

export default ReportsPage;

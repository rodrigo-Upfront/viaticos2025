import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import {
  Download as DownloadIcon,
  Visibility as ViewIcon,
  FileDownload as FileDownloadIcon,
  Add as AddIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

import ConfirmDialog from '../components/forms/ConfirmDialog';
import { reportService, ExpenseReport as ApiReport, ExpenseReportSummary, ExpenseReportManualCreate } from '../services/reportService';
import { countryService, Country as ApiCountry } from '../services/countryService';
import { currencyService, Currency } from '../services/currencyService';

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
    status: '',
  });

  // Load data on component mount
  useEffect(() => {
    loadReports();
    loadSummary();
    loadCountries();
    loadCurrencies();
    loadFilterOptions();
  }, []);

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

    if (searchFilters.status) {
      filtered = filtered.filter(report => 
        report.status.toLowerCase().includes(searchFilters.status.toLowerCase())
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
      const response = await reportService.getReports();
      const mappedReports = response.reports.map(mapApiToFrontend);
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

  const REPORT_STATUS_LABELS: Record<string, { en: string; es: string }> = {
    pending: { en: "Pending Submit", es: "Pendiente Envío" },
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
      
      const response = await fetch(`/api/approvals/reports/${report.id}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to submit report');
      }

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



  const handleExportAll = () => {
    // Placeholder for export all functionality
    setSnackbar({
      open: true,
      message: 'Export All functionality not yet implemented. In production, this would generate an Excel/CSV file with all approved expense reports.',
      severity: 'info'
    });
    
    // Simulate file download preparation
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = '#'; // This would be the actual file URL from backend
      link.download = `expense-reports-all-${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
    }, 1000);
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
    if (new Date(createDialog.start_date) >= new Date(createDialog.end_date)) {
      setSnackbar({ open: true, message: 'End date must be after start date', severity: 'warning' });
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
            Create Reimbursement
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportAll}
            sx={{ mr: 2 }}
          >
            Export All
          </Button>
          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={handleGenerateReport}
          >
            Generate Report
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Reports
              </Typography>
              <Typography variant="h4">
                {loading.summary ? '-' : (summary?.total_reports || expenseReports.length)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pending Approval
              </Typography>
              <Typography variant="h4">
                {loading.summary ? '-' : (summary?.pending_reports || expenseReports.filter(r => r.status.toLowerCase() === 'pending').length)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Expenses
              </Typography>
              <Typography variant="h4">
                {loading.summary ? '-' : `$${summary?.total_expenses || expenseReports.reduce((sum, r) => sum + r.totalExpenses, 0).toLocaleString()}`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Over Budget
              </Typography>
              <Typography variant="h4">
                {loading.reports ? '-' : expenseReports.filter(r => r.budgetStatus === 'Over-Budget').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Search & Filter
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Reason"
              value={searchFilters.reason}
              onChange={(e) => setSearchFilters(prev => ({ ...prev, reason: e.target.value }))}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={searchFilters.status}
                label="Status"
                onChange={(e) => setSearchFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <MenuItem value=""><em>All</em></MenuItem>
                {filterOptions.statuses.map(status => (
                  <MenuItem key={status} value={status}>{getStatusLabel(status)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Country</InputLabel>
              <Select
                value={searchFilters.country}
                label="Country"
                onChange={(e) => setSearchFilters(prev => ({ ...prev, country: e.target.value }))}
              >
                <MenuItem value=""><em>All</em></MenuItem>
                {filterOptions.countries.map(country => (
                  <MenuItem key={country.id} value={country.name}>{country.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Budget Status</InputLabel>
              <Select
                value={searchFilters.budgetStatus}
                label="Budget Status"
                onChange={(e) => setSearchFilters(prev => ({ ...prev, budgetStatus: e.target.value }))}
              >
                <MenuItem value=""><em>All</em></MenuItem>
                {filterOptions.budget_statuses.map(status => (
                  <MenuItem key={status} value={status}>{status.replace('_', ' ')}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
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
              <TableCell>Type</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Report Date</TableCell>
              <TableCell>Total Expenses</TableCell>
              <TableCell>Prepaid Amount</TableCell>
              <TableCell>Budget Status</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading.reports ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Loading expense reports...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No expense reports found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <Chip
                      label={report.report_type || 'PREPAYMENT'}
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
                        label={report.budgetStatus}
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
        <DialogTitle>Create Reimbursement Report</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Reason"
            value={createDialog.reason}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateDialog(prev => ({ ...prev, reason: e.target.value }))}
            margin="normal"
            required
          />
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Country</InputLabel>
            <Select
              value={createDialog.country_id}
              label="Country"
              onChange={(e: any) => setCreateDialog(prev => ({ ...prev, country_id: e.target.value }))}
            >
              <MenuItem value={0}><em>Select a country</em></MenuItem>
              {countries.map(c => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Currency</InputLabel>
            <Select
              value={createDialog.currency_id}
              label="Currency"
              onChange={(e: any) => setCreateDialog(prev => ({ ...prev, currency_id: e.target.value }))}
            >
              <MenuItem value={0}><em>Select currency</em></MenuItem>
              {currencies.map(c => (
                <MenuItem key={c.id} value={c.id}>{c.code} - {c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Start Date"
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
            label="End Date"
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
            Cancel
          </Button>
          <Button onClick={handleCreateReimbursement} variant="contained" disabled={loading.action}>
            {loading.action ? 'Creating...' : 'Create'}
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

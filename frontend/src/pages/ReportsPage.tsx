import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
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
  Send as SendIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import ReportViewModal from '../components/modals/ReportViewModal';
import ConfirmDialog from '../components/forms/ConfirmDialog';
import { reportService, ExpenseReport as ApiReport, ExpenseReportSummary } from '../services/reportService';

interface ExpenseReport {
  id: number;
  prepaymentId: number;
  reportDate: string;
  totalExpenses: number;
  prepaidAmount: number;
  budgetStatus: string;
  status: string;
}

const ReportsPage: React.FC = () => {
  const { t } = useTranslation();

  // Loading state
  const [loading, setLoading] = useState({
    reports: true,
    summary: true,
    action: false,
  });

  // Data state
  const [expenseReports, setExpenseReports] = useState<ExpenseReport[]>([]);
  const [summary, setSummary] = useState<ExpenseReportSummary | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadReports();
    loadSummary();
  }, []);

  // Helper function to map API report to frontend format
  const mapApiToFrontend = (apiReport: ApiReport): ExpenseReport => {
    return {
      id: apiReport.id,
      prepaymentId: apiReport.prepayment_id,
      reportDate: apiReport.created_at.split('T')[0], // Extract date part
      totalExpenses: parseFloat(apiReport.total_expenses || '0'),
      prepaidAmount: parseFloat(apiReport.prepayment_amount || '0'),
      budgetStatus: (parseFloat(apiReport.total_expenses || '0') > parseFloat(apiReport.prepayment_amount || '0')) ? 'Over-Budget' : 'Under-Budget',
      status: apiReport.status,
    };
  };

  // Load reports from API
  const loadReports = async () => {
    try {
      setLoading(prev => ({ ...prev, reports: true }));
      const response = await reportService.getReports();
      const mappedReports = response.reports.map(mapApiToFrontend);
      setExpenseReports(mappedReports);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
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

  const [viewModal, setViewModal] = useState({
    open: false,
    report: undefined as typeof expenseReports[0] | undefined
  });

  const handleViewReport = (report: typeof expenseReports[0]) => {
    setViewModal({ open: true, report });
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

  const handleSendForApproval = (report: ExpenseReport) => {
    if (report.status !== 'pending') {
      setSnackbar({
        open: true,
        message: 'Only pending reports can be sent for approval',
        severity: 'warning'
      });
      return;
    }

    setConfirmDialog({
      open: true,
      title: 'Send for Approval',
      message: `The expense report #${report.id} is already pending approval and will appear in the approvals queue for authorized users.`,
      onConfirm: () => {
        setSnackbar({
          open: true,
          message: 'Expense report is in the approval queue. Approvers will be notified.',
          severity: 'info'
        });
      }
    });
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          {t('navigation.reports')}
        </Typography>
        <Box>
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
                {loading.summary ? '-' : (summary?.pending_reports || expenseReports.filter(r => r.status === 'pending').length)}
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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Report ID</TableCell>
              <TableCell>Prepayment ID</TableCell>
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
            ) : expenseReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No expense reports found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              expenseReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>{report.id}</TableCell>
                  <TableCell>{report.prepaymentId}</TableCell>
                  <TableCell>{report.reportDate}</TableCell>
                  <TableCell>${report.totalExpenses.toLocaleString()}</TableCell>
                  <TableCell>${report.prepaidAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={report.budgetStatus}
                      color={getBudgetStatusColor(report.budgetStatus) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={report.status}
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
                    {report.status === 'pending' && (
                      <IconButton
                        size="small"
                        onClick={() => handleSendForApproval(report)}
                        color="success"
                        title="Send for Approval"
                        disabled={loading.action}
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

      {/* Report View Modal */}
      <ReportViewModal
        open={viewModal.open}
        onClose={() => setViewModal({ open: false, report: undefined })}
        report={viewModal.report}
      />

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

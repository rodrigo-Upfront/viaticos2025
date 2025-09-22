import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  Assignment as AssignmentIcon,
  AccountBalance as AccountBalanceIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

import creditCardService, {
  CreditCardStatement,
  CreditCardDashboardStats,
} from '../services/creditCardService';
import CreditCardUploadModal from '../components/modals/CreditCardUploadModal';
import CreditCardDetailsModal from '../components/modals/CreditCardDetailsModal';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`credit-card-tabpanel-${index}`}
      aria-labelledby={`credit-card-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const CreditCardStatementsPage: React.FC = () => {
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState(0);
  const [statements, setStatements] = useState<CreditCardStatement[]>([]);
  const [dashboardStats, setDashboardStats] = useState<CreditCardDashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedStatementId, setSelectedStatementId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statementToDelete, setStatementToDelete] = useState<CreditCardStatement | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statementsData, statsData] = await Promise.all([
        creditCardService.getStatements(),
        creditCardService.getDashboardStats(),
      ]);
      setStatements(statementsData.statements);
      setDashboardStats(statsData);
    } catch (error) {
      console.error('Failed to load credit card data:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load credit card statements',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleUploadSuccess = () => {
    setUploadModalOpen(false);
    loadData();
    setSnackbar({
      open: true,
      message: 'Credit card statement uploaded successfully',
      severity: 'success',
    });
  };

  const handleViewDetails = (statementId: number) => {
    setSelectedStatementId(statementId);
    setDetailsModalOpen(true);
  };

  const handleDeleteClick = (statement: CreditCardStatement) => {
    setStatementToDelete(statement);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!statementToDelete) return;

    try {
      await creditCardService.deleteStatement(statementToDelete.id);
      setDeleteDialogOpen(false);
      setStatementToDelete(null);
      loadData();
      setSnackbar({
        open: true,
        message: 'Statement deleted successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Failed to delete statement:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete statement',
        severity: 'error',
      });
    }
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'UPLOADED':
        return 'info';
      case 'PROCESSED':
        return 'primary';
      case 'COMPLETED':
        return 'success';
      case 'VALIDATION_ERRORS':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string): string => {
    return t(`reports.creditCardStatuses.${status}`) || status;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {t('reports.creditCardStatements')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => setUploadModalOpen(true)}
          sx={{ minWidth: 200 }}
        >
          {t('reports.uploadStatement')}
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab icon={<CloudUploadIcon />} label={t('navigation.dashboard')} />
          <Tab icon={<AssignmentIcon />} label={t('reports.statements')} />
        </Tabs>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <TabPanel value={tabValue} index={0}>
        {/* Dashboard Tab */}
        {dashboardStats && (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {t('reports.totalStatements')}
                  </Typography>
                  <Typography variant="h4">
                    {dashboardStats.total_statements}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {t('reports.pendingProcessing')}
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {dashboardStats.pending_processing}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {t('reports.completed')}
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {dashboardStats.completed_processing}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    {t('reports.totalTransactions')}
                  </Typography>
                  <Typography variant="h4">
                    {dashboardStats.total_transactions}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('reports.recentStatements')}
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>{t('reports.filename')}</TableCell>
                          <TableCell>{t('reports.uploadDate')}</TableCell>
                          <TableCell>{t('reports.status')}</TableCell>
                          <TableCell>{t('reports.records')}</TableCell>
                          <TableCell>{t('reports.actions')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dashboardStats.recent_statements.map((statement) => (
                          <TableRow key={statement.id}>
                            <TableCell>
                              <Typography variant="body2" noWrap>
                                {statement.original_filename}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {format(new Date(statement.upload_date), 'MMM dd, yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={getStatusText(statement.status)}
                                color={getStatusColor(statement.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {statement.processed_records || 0} / {statement.total_records || 0}
                            </TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() => handleViewDetails(statement.id)}
                              >
                                <ViewIcon />
                              </IconButton>
                              {(statement.status === 'UPLOADED' || statement.status === 'VALIDATION_ERRORS') && (
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteClick(statement)}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Statements Tab */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('reports.allStatements')}
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('reports.filename')}</TableCell>
                    <TableCell>{t('reports.uploadedBy')}</TableCell>
                    <TableCell>{t('reports.uploadDate')}</TableCell>
                    <TableCell>{t('reports.status')}</TableCell>
                    <TableCell>{t('reports.records')}</TableCell>
                    <TableCell>{t('reports.transactions')}</TableCell>
                    <TableCell>{t('reports.expenses')}</TableCell>
                    <TableCell>{t('reports.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statements.map((statement) => (
                    <TableRow key={statement.id}>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {statement.original_filename}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {statement.uploaded_by_name || 'Unknown'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {format(new Date(statement.upload_date), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusText(statement.status)}
                          color={getStatusColor(statement.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {statement.processed_records || 0} / {statement.total_records || 0}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {statement.transaction_count || 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {statement.consolidated_expense_count || 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(statement.id)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        {statement.status === 'PROCESSED' && (
                          <Tooltip title="Create Prepayments">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(statement.id)}
                              color="primary"
                            >
                              <AccountBalanceIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(statement.status === 'UPLOADED' || statement.status === 'VALIDATION_ERRORS') && (
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteClick(statement)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {statements.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body2" color="textSecondary">
                          No credit card statements found. Upload your first statement to get started.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Upload Modal */}
      <CreditCardUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      {/* Details Modal */}
      <CreditCardDetailsModal
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        statementId={selectedStatementId}
        onProcessingComplete={loadData}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('common.delete')} Statement</DialogTitle>
        <DialogContent>
          <Typography>
            {t('common.confirmDelete')} "{statementToDelete?.original_filename}"?
          </Typography>
          {statementToDelete?.status === 'COMPLETED' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This statement has been processed and has associated prepayments. It cannot be deleted.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={statementToDelete?.status === 'COMPLETED'}
          >
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CreditCardStatementsPage;

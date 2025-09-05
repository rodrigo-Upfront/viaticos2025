import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  CircularProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
  AccessTime as PendingIcon,
  Assignment as AssignmentIcon,
  ThumbUp as QuickApproveIcon,
  ThumbDown as QuickRejectIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import ConfirmDialog from '../components/forms/ConfirmDialog';
import PrepaymentViewModal from '../components/modals/PrepaymentViewModal';

import { approvalService, PendingApprovalItem } from '../services/approvalService';
import apiClient from '../services/apiClient';

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
      id={`approval-tabpanel-${index}`}
      aria-labelledby={`approval-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ApprovalsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tabValue, setTabValue] = React.useState(0);

  // Loading state
  const [loading, setLoading] = useState({
    pendingItems: true,
    action: false,
  });

  // Data state
  const [pendingItems, setPendingItems] = useState<PendingApprovalItem[]>([]);

  // Load pending approvals on component mount
  useEffect(() => {
    loadPendingApprovals();
    
    // Handle navigation state messages
    if (location.state?.message) {
      setSnackbar({
        open: true,
        message: location.state.message,
        severity: location.state.severity || 'success'
      });
      // Clear the state to prevent showing the message on refresh
      navigate(location.pathname, { replace: true });
    }
  }, [location.state]);

  const loadPendingApprovals = async () => {
    try {
      setLoading(prev => ({ ...prev, pendingItems: true }));
      const response = await approvalService.getPendingApprovals();
      setPendingItems(response.items);
    } catch (error) {
      console.error('Failed to load pending approvals:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load pending approvals',
        severity: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, pendingItems: false }));
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Derived data for tabs
  const pendingPrepayments = pendingItems.filter(item => item.type === 'prepayment');
  const pendingExpenseReports = pendingItems.filter(item => item.type === 'report');
  const allPendingItems = pendingItems;

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
    confirmText: undefined as string | undefined,
    cancelText: undefined as string | undefined,
    severity: undefined as 'error' | 'warning' | 'info' | undefined,
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  const [viewModal, setViewModal] = useState({
    open: false,
    type: '' as 'prepayment' | 'report' | '',
    data: null as any
  });



  const [quickRejectionDialog, setQuickRejectionDialog] = useState({
    open: false,
    reportId: null as number | null,
    rejectionReason: '',
  });

  const [rejectionDialog, setRejectionDialog] = useState({
    open: false,
    itemId: 0,
    itemType: '',
    itemName: '',
    reason: '',
  });

  const handleApprove = (listItemId: number, type: string) => {
    // Find the item in the pending list
    const item = pendingItems.find(p => p.id === listItemId);
    if (!item) return;

    const itemName = type === 'prepayment' 
      ? item.reason || 'Prepayment request'
      : `Expense Report #${item.entity_id}`;

    setConfirmDialog({
      open: true,
      title: 'Approve',
      message: 'Approve this item?',
      onConfirm: async () => {
        try {
          setLoading(prev => ({ ...prev, action: true }));
          
          if (item.type === 'prepayment') {
            await approvalService.approvePrepayment(item.entity_id, { action: 'approve' });
          } else {
            await approvalService.approveExpenseReport(item.entity_id, { action: 'approve' });
          }
          
          // Remove from pending list
          setPendingItems(prev => prev.filter(p => p.id !== listItemId));
          
          setSnackbar({
            open: true,
            message: `${item.type === 'prepayment' ? 'Prepayment' : 'Expense Report'} approved successfully`,
            severity: 'success'
          });
        } catch (error) {
          console.error('Failed to approve item:', error);
          setSnackbar({
            open: true,
            message: 'Failed to approve item',
            severity: 'error'
          });
        } finally {
          setLoading(prev => ({ ...prev, action: false }));
        }
      },
      confirmText: 'Approve',
      cancelText: 'Cancel',
      severity: 'info'
    });
  };

  const handleReject = (listItemId: number, type: string) => {
    // Find the item in the pending list
    const item = pendingItems.find(p => p.id === listItemId);
    if (!item) return;

    const itemName = type === 'prepayment' 
      ? item.reason || 'Prepayment request'
      : `Expense Report #${item.entity_id}`;

    setRejectionDialog({
      open: true,
      itemId: listItemId,
      itemType: item.type,
      itemName,
      reason: '',
    });
  };

  const handleRejectConfirm = async () => {
    const { itemId, itemType, reason } = rejectionDialog;
    const item = pendingItems.find(p => p.id === itemId);
    if (!item) return;

    try {
      setLoading(prev => ({ ...prev, action: true }));
      
      if (item.type === 'prepayment') {
        await approvalService.approvePrepayment(item.entity_id, { 
          action: 'reject',
          rejection_reason: reason || 'No reason provided'
        });
      } else {
        await approvalService.approveExpenseReport(item.entity_id, { 
          action: 'reject',
          rejection_reason: reason || 'No reason provided'
        });
      }
      
      // Remove from pending list
      setPendingItems(prev => prev.filter(p => p.id !== itemId));
      
      setSnackbar({
        open: true,
        message: `${item.type === 'prepayment' ? 'Prepayment' : 'Expense Report'} rejected`,
        severity: 'warning'
      });

      setRejectionDialog({ open: false, itemId: 0, itemType: '', itemName: '', reason: '' });
    } catch (error) {
      console.error('Failed to reject item:', error);
      setSnackbar({
        open: true,
        message: 'Failed to reject item',
        severity: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  };

  const handleApproveReport = (item: PendingApprovalItem) => {
    navigate(`/approvals/report/${item.entity_id}`);
  };

  const handleApprovalComplete = async () => {
    await loadPendingApprovals();
    setSnackbar({
      open: true,
      message: 'Report approval processed successfully',
      severity: 'success'
    });
  };

  const handleView = async (listItemId: number, type: string) => {
    const item = pendingItems.find(p => p.id === listItemId);
    if (!item) return;

    if (item.type === 'prepayment') {
      try {
        // Fetch the actual prepayment data from the API
        const response = await apiClient.get(`/prepayments/${item.entity_id}`);
        const prepaymentData = response.data;
        
        // Convert API data to PrepaymentViewModal format
        const modalData = {
          id: prepaymentData.id,
          reason: prepaymentData.reason,
          destination_country_id: prepaymentData.destination_country_id,
          destination: prepaymentData.destination_country_name || 'Unknown',
          startDate: prepaymentData.start_date,
          endDate: prepaymentData.end_date,
          amount: parseFloat(prepaymentData.amount),
          currency: prepaymentData.currency_code || prepaymentData.currency_name || 'USD',
          comment: prepaymentData.comment || '', // Use real comment from API
          justification_file: prepaymentData.justification_file || null, // Use real file from API
          status: prepaymentData.status || 'pending',
          rejection_reason: prepaymentData.rejection_reason
        };
        
        setViewModal({
          open: true,
          type: 'prepayment',
          data: modalData
        });
      } catch (error) {
        console.error('Failed to fetch prepayment details:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load prepayment details',
          severity: 'error'
        });
      }
    } else if (item.type === 'report') {
      // Navigate to full-page report view instead of modal
      navigate(`/approvals/report/${item.entity_id}`);
    }
  };

  // Helper function to determine user role based on report status
  const getUserRole = (item: PendingApprovalItem) => {
    if (item.type !== 'report') return 'other';
    
    // Accounting users should never see quick approve/reject actions for REPORTS
    // (but they can still see quick actions for prepayments)
    // Check for both uppercase and lowercase profile values
    if (user?.profile?.toLowerCase() === 'accounting') return 'accounting';
    
    // For supervisor/treasury users, show quick actions
    return 'quick_actions';
  };

  // Quick approve handler for supervisor/treasury
  const handleQuickApprove = async (reportId: number) => {
    setConfirmDialog({
      open: true,
      title: 'Quick Approve',
      message: 'Are you sure you want to quickly approve this report?',
      onConfirm: async () => {
        try {
          setLoading(prev => ({ ...prev, action: true }));
          
          const response = await apiClient.post(`/approvals/reports/${reportId}/quick-approve`);

          // Remove from pending list
          setPendingItems(prev => prev.filter(item => !(item.type === 'report' && item.entity_id === reportId)));
          
          setSnackbar({
            open: true,
            message: 'Report approved successfully',
            severity: 'success'
          });
        } catch (error) {
          console.error('Failed to approve report:', error);
          setSnackbar({
            open: true,
            message: 'Failed to approve report',
            severity: 'error'
          });
        } finally {
          setLoading(prev => ({ ...prev, action: false }));
        }
      },
      confirmText: 'Approve',
      cancelText: 'Cancel',
      severity: 'info'
    });
  };

  // Quick reject handler for supervisor/treasury
  const handleQuickReject = (reportId: number) => {
    setQuickRejectionDialog({
      open: true,
      reportId: reportId,
      rejectionReason: ''
    });
  };

  // Handle quick rejection confirmation
  const handleQuickRejectConfirm = async () => {
    if (!quickRejectionDialog.rejectionReason.trim()) {
      setSnackbar({
        open: true,
        message: 'Rejection reason is required',
        severity: 'error'
      });
      return;
    }

    try {
      setLoading(prev => ({ ...prev, action: true }));
      
      const response = await apiClient.post(`/approvals/reports/${quickRejectionDialog.reportId}/quick-reject`, {
        action: 'reject',
        rejection_reason: quickRejectionDialog.rejectionReason
      });

      // Remove from pending list
      setPendingItems(prev => prev.filter(item => !(item.type === 'report' && item.entity_id === quickRejectionDialog.reportId)));
      
      setQuickRejectionDialog({ open: false, reportId: null, rejectionReason: '' });
      
      setSnackbar({
        open: true,
        message: 'Report rejected successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Failed to reject report:', error);
      setSnackbar({
        open: true,
        message: 'Failed to reject report',
        severity: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('navigation.approvals')}
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PendingIcon color="warning" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    {t('approvals.pendingApprovals')}
                  </Typography>
                  <Typography variant="h4">
                    {loading.pendingItems ? '-' : allPendingItems.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                {t('approvals.prepaymentsPending')}
              </Typography>
              <Typography variant="h4">
                {loading.pendingItems ? '-' : pendingPrepayments.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                {t('approvals.reportsPending')}
              </Typography>
              <Typography variant="h4">
                {loading.pendingItems ? '-' : pendingExpenseReports.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                {t('approvals.totalValue')}
              </Typography>
              <Typography variant="h4">
                {loading.pendingItems ? '-' : `$${allPendingItems.reduce((sum, item) => 
                  sum + (item.type === 'prepayment' ? parseFloat(item.amount || '0') : parseFloat(item.total_expenses || '0')), 0
                ).toLocaleString()}`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label={t('tables.allPending')} />
            <Tab label={t('tables.prepayments')} />
            <Tab label={t('tables.expenseReports')} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('tables.type')}</TableCell>
                  <TableCell>{t('tables.id')}</TableCell>
                  <TableCell>{t('tables.requester')}</TableCell>
                  <TableCell>{t('tables.description')}</TableCell>
                  <TableCell>{t('common.amount')}</TableCell>
                  <TableCell>{t('tables.requestDate')}</TableCell>
                  <TableCell>{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading.pendingItems ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Loading pending approvals...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : allPendingItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No pending approvals found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  allPendingItems.map((item) => (
                    <TableRow key={`${item.type}-${item.id}`}>
                      <TableCell>
                        <Chip 
                          label={item.type === 'prepayment' ? 'Prepayment' : 'Expense Report'} 
                          color={item.type === 'prepayment' ? 'primary' : 'secondary'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{item.entity_id}</TableCell>
                      <TableCell>{item.requester}</TableCell>
                      <TableCell>
                        {item.type === 'prepayment' 
                          ? `${item.reason || 'No reason'} - ${item.destination || 'Unknown'}`
                          : `${item.reason || 'No reason provided'}`
                        }
                      </TableCell>
                      <TableCell>
                        {item.currency || 'USD'} {item.type === 'prepayment' 
                          ? parseFloat(item.amount || '0').toLocaleString()
                          : parseFloat(item.total_expenses || '0').toLocaleString()
                        }
                      </TableCell>
                      <TableCell>
                        {item.request_date}
                      </TableCell>
                      <TableCell>
                        {item.type === 'report' ? (
                          <>
                            {/* Show quick actions for supervisor/treasury, detailed for accounting */}
                            {getUserRole(item) === 'accounting' ? (
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleApproveReport(item)}
                                title="Review & Approve/Reject Expenses"
                                disabled={loading.action}
                              >
                                <AssignmentIcon />
                              </IconButton>
                            ) : (
                              <>
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleQuickApprove(item.entity_id)}
                                  title="Quick Approve"
                                  disabled={loading.action}
                                >
                                  <QuickApproveIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleQuickReject(item.entity_id)}
                                  title="Quick Reject"
                                  disabled={loading.action}
                                >
                                  <QuickRejectIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleApproveReport(item)}
                                  title="Detailed Review"
                                  disabled={loading.action}
                                >
                                  <AssignmentIcon />
                                </IconButton>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <IconButton
                              size="small"
                              onClick={() => handleView(item.id, item.type)}
                              color="info"
                              disabled={loading.action}
                            >
                              <ViewIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleApprove(item.id, item.type)}
                              disabled={loading.action}
                            >
                              <CheckIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleReject(item.id, item.type)}
                              disabled={loading.action}
                            >
                              <CloseIcon />
                            </IconButton>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>{t('prepayments.pendingPrepayments')}</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('tables.id')}</TableCell>
                  <TableCell>{t('tables.requester')}</TableCell>
                  <TableCell>{t('prepayments.reason')}</TableCell>
                  <TableCell>{t('prepayments.destination')}</TableCell>
                  <TableCell>{t('common.amount')}</TableCell>
                  <TableCell>{t('tables.requestDate')}</TableCell>
                  <TableCell>{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading.pendingItems ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : pendingPrepayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="textSecondary">
                        No pending prepayments
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingPrepayments.map((item) => (
                    <TableRow key={`prepayment-${item.entity_id}`}>
                      <TableCell>{item.entity_id}</TableCell>
                      <TableCell>{item.requester}</TableCell>
                      <TableCell>{item.reason || 'No reason provided'}</TableCell>
                      <TableCell>{item.destination || 'Unknown'}</TableCell>
                      <TableCell>
                        {item.currency} ${parseFloat(item.amount || '0').toLocaleString()}
                      </TableCell>
                      <TableCell>{item.request_date}</TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleView(item.id, item.type)}
                          color="info"
                          disabled={loading.action}
                          title="View Details"
                        >
                          <ViewIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleApprove(item.id, item.type)}
                          disabled={loading.action}
                          title="Approve"
                        >
                          <CheckIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleReject(item.id, item.type)}
                          disabled={loading.action}
                          title="Reject"
                        >
                          <CloseIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>{t('prepayments.pendingExpenseReports')}</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('tables.reportId')}</TableCell>
                  <TableCell>{t('tables.requester')}</TableCell>
                  <TableCell>{t('tables.type')}</TableCell>
                  <TableCell>{t('prepayments.reason')}</TableCell>
                  <TableCell>{t('tables.totalExpenses')}</TableCell>
                  <TableCell>{t('tables.prepaidAmount')}</TableCell>
                  <TableCell>{t('tables.budgetStatus')}</TableCell>
                  <TableCell>{t('common.date')}</TableCell>
                  <TableCell>{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading.pendingItems ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : pendingExpenseReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography variant="body2" color="textSecondary">
                        No pending expense reports
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingExpenseReports.map((item) => (
                    <TableRow key={`${item.type}-${item.entity_id}`}>
                      <TableCell>{item.entity_id}</TableCell>
                      <TableCell>{item.requester}</TableCell>
                      <TableCell>
                        <Chip 
                          label={item.prepayment_id ? "Prepayment" : "Reimbursement"} 
                          color={item.prepayment_id ? "primary" : "secondary"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{item.reason || 'N/A'}</TableCell>
                      <TableCell>{item.currency} {parseFloat(item.total_expenses || '0').toLocaleString()}</TableCell>
                      <TableCell>
                        {item.prepayment_id ? (
                          `${item.currency} ${parseFloat(item.prepaid_amount || '0').toLocaleString()}`
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {item.prepayment_id ? (
                          (() => {
                            const totalExpenses = parseFloat(item.total_expenses || '0');
                            const prepaidAmount = parseFloat(item.prepaid_amount || '0');
                            
                            if (totalExpenses > prepaidAmount) {
                              return (
                                <Chip 
                                  label="Over Budget" 
                                  color="error"
                                  size="small"
                                  variant="outlined"
                                />
                              );
                            } else if (totalExpenses < prepaidAmount) {
                              return (
                                <Chip 
                                  label="Under Budget" 
                                  color="warning"
                                  size="small"
                                  variant="outlined"
                                />
                              );
                            } else {
                              return (
                                <Chip 
                                  label="On Budget" 
                                  color="success"
                                  size="small"
                                  variant="outlined"
                                />
                              );
                            }
                          })()
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{item.report_date || item.request_date}</TableCell>
                      <TableCell>
                        {/* Show quick actions for supervisor/treasury, detailed for accounting */}
                        {getUserRole(item) === 'accounting' ? (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleApproveReport(item)}
                            title="Review & Approve/Reject Expenses"
                            disabled={loading.action}
                          >
                            <AssignmentIcon />
                          </IconButton>
                        ) : (
                          <>
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleQuickApprove(item.entity_id)}
                              title="Quick Approve"
                              disabled={loading.action}
                            >
                              <QuickApproveIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleQuickReject(item.entity_id)}
                              title="Quick Reject"
                              disabled={loading.action}
                            >
                              <QuickRejectIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleApproveReport(item)}
                              title="Detailed Review"
                              disabled={loading.action}
                            >
                              <AssignmentIcon />
                            </IconButton>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        severity={confirmDialog.severity || 'warning'}
        confirmText={confirmDialog.confirmText || 'Confirm'}
        cancelText={confirmDialog.cancelText || 'Cancel'}
      />

      {/* View Modals */}
      <PrepaymentViewModal
        open={viewModal.open && viewModal.type === 'prepayment'}
        onClose={() => setViewModal({ open: false, type: '', data: null })}
        prepayment={viewModal.data}
      />





      {/* Rejection Reason Dialog */}
      <Dialog
        open={rejectionDialog.open}
        onClose={() => setRejectionDialog({ ...rejectionDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reject {rejectionDialog.itemName}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Please provide a reason for rejecting this item:
          </Typography>
          <TextField
            label="Rejection Reason"
            multiline
            rows={3}
            fullWidth
            value={rejectionDialog.reason}
            onChange={(e) => setRejectionDialog({ ...rejectionDialog, reason: e.target.value })}
            placeholder="Enter reason for rejection..."
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setRejectionDialog({ ...rejectionDialog, open: false })}
            disabled={loading.action}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleRejectConfirm}
            color="error"
            variant="contained"
            disabled={loading.action}
          >
            {loading.action ? <CircularProgress size={20} /> : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick Rejection Dialog */}
      <Dialog 
        open={quickRejectionDialog.open} 
        onClose={() => setQuickRejectionDialog({ open: false, reportId: null, rejectionReason: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Quick Reject Report</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please provide a reason for rejecting this report:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Rejection Reason"
            value={quickRejectionDialog.rejectionReason}
            onChange={(e) => setQuickRejectionDialog(prev => ({ 
              ...prev, 
              rejectionReason: e.target.value 
            }))}
            required
            error={!quickRejectionDialog.rejectionReason.trim()}
            helperText={!quickRejectionDialog.rejectionReason.trim() ? "Rejection reason is required" : ""}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setQuickRejectionDialog({ open: false, reportId: null, rejectionReason: '' })}
            disabled={loading.action}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleQuickRejectConfirm}
            color="error"
            variant="contained"
            disabled={loading.action || !quickRejectionDialog.rejectionReason.trim()}
          >
            {loading.action ? <CircularProgress size={20} /> : 'Reject Report'}
          </Button>
        </DialogActions>
      </Dialog>

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

export default ApprovalsPage;

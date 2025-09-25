import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  CircularProgress,
  Tooltip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Email as EmailIcon,
  Retry as RetryIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  ExpandMore as ExpandMoreIcon,
  Statistics as StatsIcon,
  CleaningServices as CleanupIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { emailService, EmailNotification, EmailNotificationList, EmailStats } from '../services/emailService';

const EmailLogsPage: React.FC = () => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<EmailNotificationList>({
    items: [],
    total: 0,
    page: 1,
    per_page: 50,
    total_pages: 0
  });
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filters
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [recipientFilter, setRecipientFilter] = useState('');
  
  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<EmailNotification | null>(null);
  const [cleanupModalOpen, setCleanupModalOpen] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(30);

  useEffect(() => {
    loadData();
  }, [page, statusFilter, eventTypeFilter, recipientFilter]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: any = { page, per_page: 50 };
      if (statusFilter) filters.status_filter = statusFilter;
      if (eventTypeFilter) filters.event_type = eventTypeFilter;
      if (recipientFilter) filters.recipient_email = recipientFilter;
      
      const data = await emailService.getEmailLogs(filters);
      setNotifications(data);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to load email logs');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await emailService.getEmailStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load email stats:', error);
    }
  };

  const handleRetry = async (notificationId: number) => {
    try {
      setError(null);
      const result = await emailService.retryEmailNotification(notificationId);
      
      if (result.success) {
        setSuccess(result.message);
        loadData();
        loadStats();
      } else {
        setError(result.message);
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to retry email');
    }
  };

  const handleRetryAllFailed = async () => {
    try {
      setError(null);
      const result = await emailService.retryAllFailedNotifications(50);
      setSuccess(result.message);
      loadData();
      loadStats();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to retry failed emails');
    }
  };

  const handleView = (notification: EmailNotification) => {
    setSelectedNotification(notification);
    setViewModalOpen(true);
  };

  const handleDelete = async (notificationId: number) => {
    if (window.confirm(t('emailLogs.confirmDelete'))) {
      try {
        await emailService.deleteEmailLog(notificationId);
        setSuccess(t('emailLogs.deleteSuccess'));
        loadData();
        loadStats();
      } catch (error: any) {
        setError(error.response?.data?.detail || 'Failed to delete email log');
      }
    }
  };

  const handleCleanup = async () => {
    try {
      const result = await emailService.cleanupOldLogs(cleanupDays, statusFilter || undefined);
      setSuccess(result.message);
      setCleanupModalOpen(false);
      loadData();
      loadStats();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to cleanup logs');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <SuccessIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'pending':
        return <PendingIcon color="warning" />;
      default:
        return <PendingIcon />;
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' => {
    switch (status) {
      case 'sent': return 'success';
      case 'failed': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const formatEventType = (eventType: string) => {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          <EmailIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          {t('emailLogs.title')}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
          >
            {t('common.refresh')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RetryIcon />}
            onClick={handleRetryAllFailed}
            color="warning"
          >
            {t('emailLogs.retryAllFailed')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<CleanupIcon />}
            onClick={() => setCleanupModalOpen(true)}
            color="error"
          >
            {t('emailLogs.cleanup')}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Statistics */}
      {stats && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <StatsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              {t('emailLogs.statistics')}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {stats.total_notifications}
                  </Typography>
                  <Typography variant="caption">
                    {t('emailLogs.totalEmails')}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {stats.status_breakdown.sent || 0}
                  </Typography>
                  <Typography variant="caption">
                    {t('emailLogs.sentEmails')}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="error.main">
                    {stats.status_breakdown.failed || 0}
                  </Typography>
                  <Typography variant="caption">
                    {t('emailLogs.failedEmails')}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="info.main">
                    {stats.success_rate.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption">
                    {t('emailLogs.successRate')}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('common.status')}</InputLabel>
              <Select
                value={statusFilter}
                label={t('common.status')}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">
                  <em>{t('common.all')}</em>
                </MenuItem>
                <MenuItem value="sent">{t('emailLogs.sent')}</MenuItem>
                <MenuItem value="failed">{t('emailLogs.failed')}</MenuItem>
                <MenuItem value="pending">{t('emailLogs.pending')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('emailLogs.eventType')}</InputLabel>
              <Select
                value={eventTypeFilter}
                label={t('emailLogs.eventType')}
                onChange={(e) => setEventTypeFilter(e.target.value)}
              >
                <MenuItem value="">
                  <em>{t('common.all')}</em>
                </MenuItem>
                {Array.from(new Set(notifications.items.map(n => n.event_type))).map(eventType => (
                  <MenuItem key={eventType} value={eventType}>
                    {formatEventType(eventType)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label={t('emailLogs.recipientEmail')}
              value={recipientFilter}
              onChange={(e) => setRecipientFilter(e.target.value)}
              placeholder="Filter by email..."
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              variant="outlined"
              onClick={() => {
                setStatusFilter('');
                setEventTypeFilter('');
                setRecipientFilter('');
                setPage(1);
              }}
              fullWidth
            >
              {t('common.clearFilters')}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Email Logs Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('common.status')}</TableCell>
              <TableCell>{t('emailLogs.eventType')}</TableCell>
              <TableCell>{t('emailLogs.recipient')}</TableCell>
              <TableCell>{t('emailLogs.subject')}</TableCell>
              <TableCell>{t('emailLogs.language')}</TableCell>
              <TableCell>{t('emailLogs.sentAt')}</TableCell>
              <TableCell>{t('emailLogs.retryCount')}</TableCell>
              <TableCell>{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : notifications.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary">
                    {t('emailLogs.noLogs')}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              notifications.items.map((notification) => (
                <TableRow key={notification.id}>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(notification.status)}
                      label={t(`emailLogs.${notification.status}`)}
                      color={getStatusColor(notification.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatEventType(notification.event_type)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {notification.recipient_name || notification.recipient_email}
                      </Typography>
                      {notification.recipient_name && (
                        <Typography variant="caption" color="text.secondary">
                          {notification.recipient_email}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {notification.subject}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={notification.language.toUpperCase()}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {notification.sent_at 
                      ? new Date(notification.sent_at).toLocaleString()
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={notification.retry_count}
                      size="small"
                      color={notification.retry_count > 0 ? 'warning' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={t('common.view')}>
                      <IconButton
                        size="small"
                        onClick={() => handleView(notification)}
                        color="info"
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    {notification.status === 'failed' && (
                      <Tooltip title={t('emailLogs.retry')}>
                        <IconButton
                          size="small"
                          onClick={() => handleRetry(notification.id)}
                          color="warning"
                        >
                          <RetryIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title={t('common.delete')}>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(notification.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {notifications.total_pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={notifications.total_pages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* Email Detail Modal */}
      <Dialog
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {t('emailLogs.emailDetails')}
        </DialogTitle>
        <DialogContent>
          {selectedNotification && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">{t('common.status')}:</Typography>
                <Chip
                  icon={getStatusIcon(selectedNotification.status)}
                  label={t(`emailLogs.${selectedNotification.status}`)}
                  color={getStatusColor(selectedNotification.status)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">{t('emailLogs.eventType')}:</Typography>
                <Typography variant="body2">
                  {formatEventType(selectedNotification.event_type)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">{t('emailLogs.recipient')}:</Typography>
                <Typography variant="body2">
                  {selectedNotification.recipient_name} ({selectedNotification.recipient_email})
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">{t('emailLogs.language')}:</Typography>
                <Typography variant="body2">
                  {selectedNotification.language.toUpperCase()}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">{t('emailLogs.subject')}:</Typography>
                <Typography variant="body2">
                  {selectedNotification.subject}
                </Typography>
              </Grid>
              {selectedNotification.error_message && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="error">
                    {t('emailLogs.errorMessage')}:
                  </Typography>
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {selectedNotification.error_message}
                  </Alert>
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="subtitle2">{t('emailLogs.emailBody')}:</Typography>
                <Box
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 2,
                    mt: 1,
                    backgroundColor: 'background.paper',
                    maxHeight: 400,
                    overflow: 'auto'
                  }}
                  dangerouslySetInnerHTML={{ __html: selectedNotification.body }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {selectedNotification?.status === 'failed' && (
            <Button
              onClick={() => {
                handleRetry(selectedNotification.id);
                setViewModalOpen(false);
              }}
              color="warning"
              startIcon={<RetryIcon />}
            >
              {t('emailLogs.retry')}
            </Button>
          )}
          <Button onClick={() => setViewModalOpen(false)}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cleanup Modal */}
      <Dialog
        open={cleanupModalOpen}
        onClose={() => setCleanupModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <CleanupIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          {t('emailLogs.cleanupOldLogs')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('emailLogs.daysToKeep')}
                type="number"
                value={cleanupDays}
                onChange={(e) => setCleanupDays(Number(e.target.value))}
                inputProps={{ min: 1, max: 365 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Alert severity="warning">
                {t('emailLogs.cleanupWarning', { days: cleanupDays })}
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCleanupModalOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleCleanup}
            color="error"
            variant="contained"
          >
            {t('emailLogs.confirmCleanup')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmailLogsPage;

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
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
  Grid,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CreditCard as CardIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { statementService, Statement, StatementTransaction, StatementSummary } from '../services/statementService';
import EditableTransactionTable from '../components/EditableTransactionTable';

// Types are imported from statementService

const StatementsPage: React.FC = () => {
  const { t } = useTranslation();
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState<Statement | null>(null);
  const [transactions, setTransactions] = useState<StatementTransaction[]>([]);
  const [summary, setSummary] = useState<StatementSummary | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // File upload with drag & drop
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: handleFileUpload
  });

  useEffect(() => {
    loadStatements();
  }, [statusFilter]);

  const loadStatements = async () => {
    setLoading(true);
    try {
      const response = await statementService.getStatements(statusFilter || undefined);
      setStatements(response.statements || []);
    } catch (error) {
      console.error('Error loading statements:', error);
    } finally {
      setLoading(false);
    }
  };

  async function handleFileUpload(acceptedFiles: File[]) {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);

    try {
      const response = await statementService.uploadStatement(file);
      console.log('Upload successful:', response);
      loadStatements(); // Refresh the list
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  }

  const handleViewDetails = async (statement: Statement) => {
    setSelectedStatement(statement);
    setLoading(true);
    
    try {
      // Load transactions
      const transactionsData = await statementService.getStatementTransactions(statement.id);
      setTransactions(transactionsData);

      // Load summary
      const summaryData = await statementService.getStatementSummary(statement.id);
      setSummary(summaryData);

      setDetailsOpen(true);
    } catch (error) {
      console.error('Error loading statement details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (statementId: number) => {
    if (!window.confirm(t('statements.confirmDelete'))) return;

    try {
      await statementService.deleteStatement(statementId);
      loadStatements();
    } catch (error) {
      console.error('Error deleting statement:', error);
    }
  };

  const handleReprocess = async (statementId: number) => {
    try {
      await statementService.reprocessStatement(statementId);
      loadStatements();
    } catch (error) {
      console.error('Error reprocessing statement:', error);
    }
  };

  const handleTransactionUpdate = async (transactionId: number, data: Partial<StatementTransaction>) => {
    if (!selectedStatement) return;
    
    try {
      const updatedTransaction = await statementService.updateTransaction(selectedStatement.id, transactionId, data);
      
      // Update the transactions in state
      setTransactions(transactions.map(t => 
        t.id === transactionId ? { ...t, ...updatedTransaction } : t
      ));
      
      // Refresh statement details to update totals
      const summaryData = await statementService.getStatementSummary(selectedStatement.id);
      setSummary(summaryData);
      
      // Refresh the main statements list to update totals there too
      loadStatements();
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  };

  const handleTransactionDelete = async (transactionId: number) => {
    if (!selectedStatement) return;
    
    try {
      await statementService.deleteTransaction(selectedStatement.id, transactionId);
      
      // Remove transaction from state
      setTransactions(transactions.filter(t => t.id !== transactionId));
      
      // Refresh statement details to update totals
      const summaryData = await statementService.getStatementSummary(selectedStatement.id);
      setSummary(summaryData);
      
      // Refresh the main statements list to update totals there too
      loadStatements();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  };

  const handleTransactionAdd = async (data: Omit<StatementTransaction, 'id'>) => {
    if (!selectedStatement) return;
    
    try {
      const newTransaction = await statementService.addTransaction(selectedStatement.id, data);
      
      // Add transaction to state
      setTransactions([...transactions, newTransaction]);
      
      // Refresh statement details to update totals
      const summaryData = await statementService.getStatementSummary(selectedStatement.id);
      setSummary(summaryData);
      
      // Refresh the main statements list to update totals there too
      loadStatements();
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'processed': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const formatAmount = (amount?: number, currency: string = 'PEN') => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'PEN',
    }).format(amount);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CardIcon />
          {t('statements.title')}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadStatements}
          disabled={loading}
        >
          {t('common.refresh')}
        </Button>
      </Box>

      {/* Upload Area */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
              transition: 'all 0.2s ease'
            }}
          >
            <input {...getInputProps()} />
            <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive 
                ? t('statements.dropFileHere')
                : t('statements.uploadStatement')
              }
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('statements.uploadHelp')}
            </Typography>
            {uploading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {t('statements.uploading')}
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Filter Controls */}
      <Box sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>{t('statements.filterStatus')}</InputLabel>
          <Select
            value={statusFilter}
            label={t('statements.filterStatus')}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">{t('common.all')}</MenuItem>
            <MenuItem value="PENDING">{t('statements.pending')}</MenuItem>
            <MenuItem value="PROCESSED">{t('statements.processed')}</MenuItem>
            <MenuItem value="FAILED">{t('statements.rejected')}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Statements Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('statements.filename')}</TableCell>
              <TableCell>{t('statements.fileSize')}</TableCell>
              <TableCell>{t('statements.status')}</TableCell>
              <TableCell>{t('statements.transactions')}</TableCell>
              <TableCell>{t('statements.totalLocal')}</TableCell>
              <TableCell>{t('statements.totalUSD')}</TableCell>
              <TableCell>{t('statements.uploadDate')}</TableCell>
              <TableCell align="center">{t('tables.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {statements.map((statement) => (
              <TableRow key={statement.id}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {statement.original_filename}
                  </Typography>
                  {statement.processing_notes && (
                    <Typography variant="caption" color="text.secondary">
                      {statement.processing_notes}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{formatFileSize(statement.file_size)}</TableCell>
                <TableCell>
                  <Chip
                    label={t(`status.${statement.status.toLowerCase()}`)}
                    color={getStatusColor(statement.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{statement.total_transactions}</TableCell>
                <TableCell>{formatAmount(parseFloat(statement.total_amount_local || '0'), 'PEN')}</TableCell>
                <TableCell>{formatAmount(parseFloat(statement.total_amount_usd || '0'), 'USD')}</TableCell>
                <TableCell>
                  {new Date(statement.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell align="center">
                  <Tooltip title={t('statements.viewDetails')}>
                    {statement.status === 'PENDING' ? (
                      <span>
                        <IconButton
                          size="small"
                          disabled
                        >
                          <ViewIcon />
                        </IconButton>
                      </span>
                    ) : (
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetails(statement)}
                      >
                        <ViewIcon />
                      </IconButton>
                    )}
                  </Tooltip>
                  {statement.status === 'FAILED' && (
                    <Tooltip title={t('statements.reprocess')}>
                      <IconButton
                        size="small"
                        onClick={() => handleReprocess(statement.id)}
                      >
                        <RefreshIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title={t('common.delete')}>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(statement.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Statement Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {t('statements.statementDetails')}
          {selectedStatement && ` - ${selectedStatement.original_filename}`}
        </DialogTitle>
        <DialogContent>
          {summary && (
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {t('statements.summary')}
                    </Typography>
                    <Typography>
                      {t('statements.totalTransactions')}: {summary.total_transactions}
                    </Typography>
                    <Typography>
                      {t('statements.matchedTransactions')}: {summary.matched_transactions}
                    </Typography>
                    <Typography>
                      {t('statements.matchPercentage')}: {summary.match_percentage}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {t('statements.totals')}
                    </Typography>
                    <Typography>
                      {t('statements.totalLocal')}: {formatAmount(summary.total_pen, 'PEN')}
                    </Typography>
                    <Typography>
                      {t('statements.totalUSD')}: {formatAmount(summary.total_usd, 'USD')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Editable Transactions Table */}
          <EditableTransactionTable
            transactions={transactions}
            statementId={selectedStatement?.id || 0}
            onTransactionUpdate={handleTransactionUpdate}
            onTransactionDelete={handleTransactionDelete}
            onTransactionAdd={handleTransactionAdd}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {loading && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
          <LinearProgress />
        </Box>
      )}
    </Box>
  );
};

export default StatementsPage;

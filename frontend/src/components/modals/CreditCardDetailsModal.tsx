import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Chip,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  AccountBalance as AccountBalanceIcon,
  Receipt as ReceiptIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

import creditCardService, {
  CreditCardStatement,
  CreditCardTransaction,
  CreditCardConsolidatedExpense,
} from '../../services/creditCardService';

interface CreditCardDetailsModalProps {
  open: boolean;
  onClose: () => void;
  statementId: number | null;
  onProcessingComplete: () => void;
}

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
      id={`details-tabpanel-${index}`}
      aria-labelledby={`details-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

const CreditCardDetailsModal: React.FC<CreditCardDetailsModalProps> = ({
  open,
  onClose,
  statementId,
  onProcessingComplete,
}) => {
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState(0);
  const [statement, setStatement] = useState<CreditCardStatement | null>(null);
  const [transactions, setTransactions] = useState<CreditCardTransaction[]>([]);
  const [consolidatedExpenses, setConsolidatedExpenses] = useState<CreditCardConsolidatedExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const getDetailsStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'UPLOADED':
        return 'info';
      case 'PROCESSED':
      case 'MATCHED':
        return 'primary';
      case 'COMPLETED':
      case 'EXPENSE_CREATED':
        return 'success';
      case 'VALIDATION_ERRORS':
        return 'error';
      case 'CONSOLIDATED':
        return 'secondary';
      case 'PREPAYMENT_CREATED':
        return 'warning';
      default:
        return 'default';
    }
  };

  useEffect(() => {
    if (open && statementId) {
      loadStatementDetails();
    }
  }, [open, statementId]);

  const loadStatementDetails = async () => {
    if (!statementId) return;

    setLoading(true);
    setError('');

    try {
      const [statementData, transactionsData, consolidatedData] = await Promise.all([
        creditCardService.getStatement(statementId),
        creditCardService.getStatementTransactions(statementId),
        creditCardService.getStatementConsolidatedExpenses(statementId),
      ]);

      setStatement(statementData);
      setTransactions(transactionsData);
      setConsolidatedExpenses(consolidatedData);
    } catch (error: any) {
      console.error('Failed to load statement details:', error);
      setError(error?.response?.data?.detail || 'Failed to load statement details');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };


  const getTransactionTypeColor = (type: string): 'default' | 'primary' | 'secondary' => {
    return type === 'CARGO ACUM.CPRA.EXTERIOR' ? 'secondary' : 'primary';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VisibilityIcon />
            Credit Card Statement Details
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {statement && (
          <Box>
            {/* Statement Overview */}
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Statement Overview
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Filename
                  </Typography>
                  <Typography variant="body2">
                    {statement.original_filename}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Upload Date
                  </Typography>
                  <Typography variant="body2">
                    {format(new Date(statement.upload_date), 'MMM dd, yyyy HH:mm')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Status
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={statement.status}
                            color={getDetailsStatusColor(statement.status)}
                      size="small"
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Records
                  </Typography>
                  <Typography variant="body2">
                    {statement.processed_records} / {statement.total_records}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Uploaded By
                  </Typography>
                  <Typography variant="body2">
                    {statement.uploaded_by_name}
                  </Typography>
                </Box>
              </Box>

              {statement.validation_errors && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Validation Issues:</strong>
                  </Typography>
                  {statement.validation_errors.unmatched_credit_cards && (
                    <Typography variant="body2">
                      • Unmatched Cards: {statement.validation_errors.unmatched_credit_cards.join(', ')}
                    </Typography>
                  )}
                  {statement.validation_errors.missing_currencies && (
                    <Typography variant="body2">
                      • Missing Currencies: {statement.validation_errors.missing_currencies.join(', ')}
                    </Typography>
                  )}
                </Alert>
              )}
            </Paper>

            {/* Tabs for detailed views */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab icon={<AccountBalanceIcon />} label={`Consolidated (${consolidatedExpenses.length})`} />
                <Tab icon={<ReceiptIcon />} label={`Transactions (${transactions.length})`} />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              {/* Consolidated Expenses Tab */}
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Supplier</TableCell>
                      <TableCell>Currency</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell align="center">Transactions</TableCell>
                      <TableCell>Prepayment</TableCell>
                      <TableCell>Expense</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {consolidatedExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {expense.matched_user_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>
                            {expense.expense_description}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>
                            {expense.supplier_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {expense.currency_code}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {expense.total_amount}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={expense.transaction_count}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {expense.associated_prepayment_id ? (
                            <Tooltip title={expense.associated_prepayment_reason || ''}>
                              <Chip
                                label={`#${expense.associated_prepayment_id}`}
                                size="small"
                                color="primary"
                              />
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="textSecondary">
                              Not created
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {expense.created_expense_id ? (
                            <Tooltip title={expense.created_expense_purpose || ''}>
                              <Chip
                                label={`#${expense.created_expense_id}`}
                                size="small"
                                color="success"
                              />
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="textSecondary">
                              Not created
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={expense.status}
                            color={getDetailsStatusColor(expense.status)}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {/* Transactions Tab */}
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Merchant</TableCell>
                      <TableCell>Currency</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={transaction.transaction_type}
                            color={getTransactionTypeColor(transaction.transaction_type)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {transaction.matched_user_name || 'Unmatched'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {transaction.credit_card_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>
                            {transaction.merchant || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {transaction.currency_code}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {transaction.amount}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>
                            {transaction.description || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={transaction.status}
                            color={getDetailsStatusColor(transaction.status)}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreditCardDetailsModal;

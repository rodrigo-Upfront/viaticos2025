import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Paper,
  IconButton,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Receipt as ReceiptIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface AccountingApprovalModalProps {
  open: boolean;
  onClose: () => void;
  onApprovalComplete: () => void;
  reportId: number;
}

interface FacturaExpense {
  id: number;
  category_name: string;
  purpose: string;
  amount: number;
  expense_date: string;
  document_number: string;
  sap_invoice_number: string;
}

interface AccountingApprovalState {
  step: number; // 1: expenses file, 2: invoice numbers, 3: compensation file, 4: compensation number
  sapExpensesFile: string;
  sapCompensationFile: string;
  sapCompensationNumber: string;
  facturaExpenses: FacturaExpense[];
  loading: boolean;
  error: string;
  success: string;
}

const AccountingApprovalModal: React.FC<AccountingApprovalModalProps> = ({
  open,
  onClose,
  onApprovalComplete,
  reportId
}) => {
  const { t } = useTranslation();
  
  const [state, setState] = useState<AccountingApprovalState>({
    step: 1,
    sapExpensesFile: '',
    sapCompensationFile: '',
    sapCompensationNumber: '',
    facturaExpenses: [],
    loading: false,
    error: '',
    success: ''
  });

  // Load current state when modal opens
  useEffect(() => {
    if (open && reportId) {
      loadAccountingState();
    }
  }, [open, reportId]);

  const loadAccountingState = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: '' }));
      
      const response = await fetch(`/api/accounting/reports/${reportId}/accounting/state`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load accounting state');
      }

      const data = await response.json();
      
      // Check if there are FACTURA expenses
      const hasFacturaExpenses = data.factura_expenses && data.factura_expenses.length > 0;
      
      // Adjust step based on FACTURA expenses availability
      let adjustedStep = data.step;
      if (!hasFacturaExpenses && data.step === 1) {
        // No FACTURA expenses, skip to step 3 (compensation file generation)
        adjustedStep = 3;
      }
      
      setState(prev => ({
        ...prev,
        loading: false,
        step: adjustedStep,
        sapExpensesFile: data.sap_expenses_file || '',
        sapCompensationFile: data.sap_compensation_file || '',
        sapCompensationNumber: data.sap_compensation_number || '',
        facturaExpenses: data.factura_expenses || []
      }));

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || t('accounting.loadStateError')
      }));
    }
  };

  const handleGenerateExpensesFile = async () => {
    setState(prev => ({ ...prev, loading: true, error: '', success: '' }));

    try {
      const response = await fetch(`/api/accounting/reports/${reportId}/accounting/expenses-file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || t('accounting.expensesFileError'));
      }

      setState(prev => ({
        ...prev,
        loading: false,
        step: 2,
        sapExpensesFile: data.sap_expenses_file,
        facturaExpenses: data.factura_expenses || [],
        success: t('accounting.expensesFileSuccess')
      }));

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || t('accounting.expensesFileError')
      }));
    }
  };

  const handleDownloadFile = async (fileType: 'expenses' | 'compensation') => {
    try {
      const response = await fetch(`/api/accounting/reports/${reportId}/sap-files/${fileType}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(t('accounting.downloadError'));
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-report-${reportId}-${fileType}-sap.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setState(prev => ({ ...prev, success: t('accounting.downloadSuccess') }));

    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message || t('accounting.downloadError') }));
    }
  };

  const handleUpdateInvoiceNumbers = async () => {
    // Validate all FACTURA expenses have SAP invoice numbers
    const invalidExpenses = state.facturaExpenses.filter(exp => !exp.sap_invoice_number.trim());
    if (invalidExpenses.length > 0) {
      setState(prev => ({ ...prev, error: t('accounting.invoiceNumbersRequired') }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: '', success: '' }));

    try {
      const invoiceNumbers = state.facturaExpenses.map(exp => ({
        expense_id: exp.id,
        sap_invoice_number: exp.sap_invoice_number
      }));

      const response = await fetch(`/api/accounting/reports/${reportId}/accounting/invoice-numbers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          invoice_numbers: invoiceNumbers
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || t('accounting.invoiceNumbersError'));
      }

      setState(prev => ({
        ...prev,
        loading: false,
        step: 3,
        success: t('accounting.invoiceNumbersSuccess')
      }));

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || t('accounting.invoiceNumbersError')
      }));
    }
  };

  const handleGenerateCompensationFile = async () => {
    setState(prev => ({ ...prev, loading: true, error: '', success: '' }));

    try {
      const response = await fetch(`/api/accounting/reports/${reportId}/accounting/compensation-file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || t('accounting.compensationFileError'));
      }

      setState(prev => ({
        ...prev,
        loading: false,
        step: 4,
        sapCompensationFile: data.sap_compensation_file,
        success: t('accounting.compensationFileSuccess')
      }));

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || t('accounting.compensationFileError')
      }));
    }
  };

  const handleCompleteApproval = async () => {
    if (!state.sapCompensationNumber.trim()) {
      setState(prev => ({ ...prev, error: t('accounting.compensationNumberRequired') }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: '', success: '' }));

    try {
      const response = await fetch(`/api/accounting/reports/${reportId}/accounting/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          sap_compensation_number: state.sapCompensationNumber
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || t('accounting.completeError'));
      }

      setState(prev => ({
        ...prev,
        loading: false,
        success: t('accounting.approvalComplete')
      }));

      // Wait a moment to show success message, then close and refresh
      setTimeout(() => {
        onApprovalComplete();
        onClose();
      }, 1500);

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || t('accounting.completeError')
      }));
    }
  };

  const handleInvoiceNumberChange = (expenseId: number, value: string) => {
    setState(prev => ({
      ...prev,
      facturaExpenses: prev.facturaExpenses.map(exp =>
        exp.id === expenseId ? { ...exp, sap_invoice_number: value } : exp
      ),
      error: ''
    }));
  };

  // Dynamic steps based on whether there are FACTURA expenses
  const steps = state.facturaExpenses.length > 0 ? [
    t('accounting.generateExpensesFile'),
    t('accounting.enterInvoiceNumbers'),
    t('accounting.generateCompensationFile'),
    t('accounting.enterCompensationNumber')
  ] : [
    t('accounting.generateCompensationFile'),
    t('accounting.enterCompensationNumber')
  ];

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle>
        <Typography variant="h6" component="div">
          {t('accounting.approvalTitle')} - {t('reports.reportId', { id: reportId })}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Stepper activeStep={state.facturaExpenses.length > 0 ? state.step - 1 : state.step - 3} alternativeLabel>
            {steps.map((label, index) => (
              <Step key={index} completed={state.facturaExpenses.length > 0 ? state.step > index + 1 : state.step > index + 3}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {state.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {state.error}
          </Alert>
        )}

        {state.success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {state.success}
          </Alert>
        )}

        {/* Step 1: Generate Expenses File */}
        {state.step === 1 && (
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('accounting.step1Title')}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              {t('accounting.step1Description')}
            </Typography>
            
            {/* Check if there are FACTURA expenses */}
            {state.facturaExpenses.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                {t('accounting.noFacturaExpenses')}
              </Alert>
            ) : null}
          </Paper>
        )}

        {/* Step 2: Enter SAP Invoice Numbers */}
        {state.step === 2 && (
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('accounting.step2Title')}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              {t('accounting.step2Description')}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <CheckCircleIcon color="success" />
              <Typography variant="body2">
                {t('accounting.expensesFileGenerated')}
              </Typography>
              <Button
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => handleDownloadFile('expenses')}
              >
                {t('accounting.downloadExpensesFile')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => setState(prev => ({ ...prev, step: 1 }))}
                sx={{ ml: 'auto' }}
              >
                {t('accounting.regenerateFile')}
              </Button>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {state.facturaExpenses.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('expenses.category')}</TableCell>
                      <TableCell>{t('expenses.purpose')}</TableCell>
                      <TableCell>{t('expenses.amount')}</TableCell>
                      <TableCell>{t('expenses.date')}</TableCell>
                      <TableCell>{t('expenses.documentNumber')}</TableCell>
                      <TableCell>{t('accounting.sapInvoiceNumber')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {state.facturaExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{expense.category_name}</TableCell>
                        <TableCell>{expense.purpose}</TableCell>
                        <TableCell>${expense.amount}</TableCell>
                        <TableCell>{new Date(expense.expense_date).toLocaleDateString()}</TableCell>
                        <TableCell>{expense.document_number}</TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={expense.sap_invoice_number}
                            onChange={(e) => handleInvoiceNumberChange(expense.id, e.target.value)}
                            placeholder={t('accounting.enterSapInvoiceNumber')}
                            required
                            inputProps={{ maxLength: 50 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">
                {t('accounting.noFacturaExpenses')}
              </Alert>
            )}
          </Paper>
        )}

        {/* Step 3: Generate Compensation File */}
        {state.step === 3 && (
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('accounting.step3Title')}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              {t('accounting.step3Description')}
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2">
                <CheckCircleIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle', color: 'success.main' }} />
                {t('accounting.expensesFileGenerated')}
              </Typography>
              <Typography variant="body2">
                <CheckCircleIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle', color: 'success.main' }} />
                {t('accounting.invoiceNumbersEntered')}
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Step 4: Enter Compensation Number */}
        {state.step === 4 && (
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('accounting.step4Title')}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              {t('accounting.step4Description')}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <CheckCircleIcon color="success" />
              <Typography variant="body2">
                {t('accounting.compensationFileGenerated')}
              </Typography>
              <Button
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => handleDownloadFile('compensation')}
              >
                {t('accounting.downloadCompensationFile')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => setState(prev => ({ ...prev, step: 3 }))}
                sx={{ ml: 'auto' }}
              >
                {t('accounting.regenerateCompensationFile')}
              </Button>
            </Box>

            <TextField
              fullWidth
              label={t('accounting.compensationNumber')}
              value={state.sapCompensationNumber}
              onChange={(e) => setState(prev => ({ 
                ...prev, 
                sapCompensationNumber: e.target.value.slice(0, 50),
                error: '' 
              }))}
              placeholder={t('accounting.compensationNumberPlaceholder')}
              inputProps={{ maxLength: 50 }}
              helperText={t('accounting.compensationNumberHelp')}
              disabled={state.loading}
            />
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button 
          onClick={onClose} 
          disabled={state.loading}
        >
          {t('common.cancel')}
        </Button>

        {state.step === 1 && (
          <Button
            variant="contained"
            onClick={handleGenerateExpensesFile}
            disabled={state.loading}
            startIcon={state.loading ? <CircularProgress size={20} color="inherit" /> : <ReceiptIcon />}
          >
            {state.loading ? t('common.processing') : t('accounting.generateExpensesFile')}
          </Button>
        )}

        {state.step === 2 && (
          <Button
            variant="contained"
            onClick={handleUpdateInvoiceNumbers}
            disabled={state.loading || state.facturaExpenses.some(exp => !exp.sap_invoice_number.trim())}
            startIcon={state.loading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {state.loading ? t('common.processing') : t('accounting.saveInvoiceNumbers')}
          </Button>
        )}

        {state.step === 3 && (
          <Button
            variant="contained"
            onClick={handleGenerateCompensationFile}
            disabled={state.loading}
            startIcon={state.loading ? <CircularProgress size={20} color="inherit" /> : <ReceiptIcon />}
          >
            {state.loading ? t('common.processing') : t('accounting.generateCompensationFile')}
          </Button>
        )}

        {state.step === 4 && (
          <Button
            variant="contained"
            color="success"
            onClick={handleCompleteApproval}
            disabled={state.loading || !state.sapCompensationNumber.trim()}
            startIcon={state.loading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {state.loading ? t('common.processing') : t('accounting.completeApproval')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AccountingApprovalModal;

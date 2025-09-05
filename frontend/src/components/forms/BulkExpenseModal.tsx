import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';

interface ExpenseReport {
  id: number;
  reason: string;
  country_id: number;
  currency_id: number;
  start_date: string;
  end_date: string;
  status: string;
}

interface Category {
  id: number;
  name: string;
}

interface Country {
  id: number;
  name: string;
}

interface Currency {
  id: number;
  name: string;
  code: string;
}

interface Supplier {
  id: number;
  name: string;
}

interface BulkExpenseRow {
  id: string;
  category_id: number;
  purpose: string;
  amount: number;
  expense_date: string;
  document_type: 'BOLETA' | 'FACTURA';
  boleta_supplier: string;
  factura_supplier_id: number;
  document_number: string;
  taxable: 'SI' | 'NO';
  country_id: number;
  currency_id: number;
  comments: string;
  document_file?: File;
  errors: Record<string, string>;
}

interface BulkExpenseModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (expenses: BulkExpenseRow[], reportId: number) => Promise<void>;
  reports: ExpenseReport[];
  categories: Category[];
  countries: Country[];
  currencies: Currency[];
  suppliers: Supplier[];
  loading?: boolean;
}

const BulkExpenseModal: React.FC<BulkExpenseModalProps> = ({
  open,
  onClose,
  onSave,
  reports,
  categories,
  countries,
  currencies,
  suppliers,
  loading = false
}) => {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedReportId, setSelectedReportId] = useState<number>(0);
  const [expenseRows, setExpenseRows] = useState<BulkExpenseRow[]>([]);

  const steps = [
    t('expenses.selectReport'),
    t('expenses.enterExpenses')
  ];

  // Get selected report
  const selectedReport = reports.find(r => r.id === selectedReportId);

  // Initialize with one empty row when report is selected
  useEffect(() => {
    if (selectedReport && expenseRows.length === 0) {
      const defaultRow = createEmptyRow();
      if (selectedReport) {
        defaultRow.country_id = selectedReport.country_id;
        defaultRow.currency_id = selectedReport.currency_id;
        defaultRow.expense_date = new Date().toISOString().split('T')[0];
      }
      setExpenseRows([defaultRow]);
    }
  }, [selectedReport]);

  const createEmptyRow = (): BulkExpenseRow => ({
    id: uuidv4(),
    category_id: 0,
    purpose: '',
    amount: 0,
    expense_date: '',
    document_type: 'BOLETA',
    boleta_supplier: '',
    factura_supplier_id: 0,
    document_number: '',
    taxable: 'NO',
    country_id: 0,
    currency_id: 0,
    comments: '',
    errors: {}
  });

  const handleReportSelect = (reportId: number) => {
    setSelectedReportId(reportId);
    setActiveStep(1);
  };

  const addRow = () => {
    const newRow = createEmptyRow();
    if (selectedReport) {
      newRow.country_id = selectedReport.country_id;
      newRow.currency_id = selectedReport.currency_id;
      newRow.expense_date = new Date().toISOString().split('T')[0];
    }
    setExpenseRows([...expenseRows, newRow]);
  };

  const removeRow = (rowId: string) => {
    setExpenseRows(expenseRows.filter(row => row.id !== rowId));
  };

  const updateRow = (rowId: string, field: keyof BulkExpenseRow, value: any) => {
    setExpenseRows(expenseRows.map(row => 
      row.id === rowId 
        ? { ...row, [field]: value, errors: { ...row.errors, [field]: '' } }
        : row
    ));
  };

  const validateRows = (): boolean => {
    let hasErrors = false;
    const updatedRows = expenseRows.map(row => {
      const errors: Record<string, string> = {};

      if (!row.category_id) errors.category_id = t('expenses.categoryRequired');
      if (!row.purpose.trim()) errors.purpose = t('expenses.purposeRequired');
      if (row.amount <= 0) errors.amount = t('expenses.amountRequired');
      if (!row.expense_date) errors.expense_date = t('expenses.dateRequired');
      if (!row.country_id) errors.country_id = t('expenses.countryRequired');
      if (!row.currency_id) errors.currency_id = t('expenses.currencyRequired');
      
      if (row.document_type === 'BOLETA' && !row.boleta_supplier.trim()) {
        errors.boleta_supplier = t('expenses.supplierRequired');
      }
      if (row.document_type === 'FACTURA' && !row.factura_supplier_id) {
        errors.factura_supplier_id = t('expenses.supplierRequired');
      }

      if (Object.keys(errors).length > 0) {
        hasErrors = true;
      }

      return { ...row, errors };
    });

    setExpenseRows(updatedRows);
    return !hasErrors;
  };

  const handleSubmit = async () => {
    if (!validateRows()) {
      return;
    }

    try {
      await onSave(expenseRows, selectedReportId);
      handleClose();
    } catch (error) {
      console.error('Error saving bulk expenses:', error);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setSelectedReportId(0);
    setExpenseRows([]);
    onClose();
  };

  const availableReports = reports.filter(r => 
    r.status === 'PENDING' || r.status === 'pending' || r.status === 'DRAFT' || r.status === 'draft'
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{t('expenses.createMultipleExpenses')}</Typography>
          <Stepper activeStep={activeStep} sx={{ flex: 1, ml: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      </DialogTitle>

      <DialogContent>
        {activeStep === 0 && (
          <Box sx={{ pt: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('expenses.selectReportFirst')}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              {t('expenses.selectReportHelp')}
            </Typography>

            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('tables.id')}</TableCell>
                    <TableCell>{t('reports.reason')}</TableCell>
                    <TableCell>{t('common.country')}</TableCell>
                    <TableCell>{t('common.currency')}</TableCell>
                    <TableCell>{t('reports.startDate')}</TableCell>
                    <TableCell>{t('reports.endDate')}</TableCell>
                    <TableCell>{t('common.status')}</TableCell>
                    <TableCell>{t('common.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {availableReports.map((report) => (
                    <TableRow key={report.id} hover>
                      <TableCell>{report.id}</TableCell>
                      <TableCell>{report.reason}</TableCell>
                      <TableCell>
                        {countries.find(c => c.id === report.country_id)?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {currencies.find(c => c.id === report.currency_id)?.code || '-'}
                      </TableCell>
                      <TableCell>{report.start_date}</TableCell>
                      <TableCell>{report.end_date}</TableCell>
                      <TableCell>
                        <Chip 
                          label={report.status}
                          color="primary"
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleReportSelect(report.id)}
                        >
                          {t('common.select')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {availableReports.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="textSecondary">
                  {t('expenses.noAvailableReports')}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {activeStep === 1 && selectedReport && (
          <Box sx={{ pt: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Box>
                <Typography variant="h6">
                  {t('expenses.addingExpensesTo')}: {selectedReport.reason}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {t('common.country')}: {countries.find(c => c.id === selectedReport.country_id)?.name} | 
                  {t('common.currency')}: {currencies.find(c => c.id === selectedReport.currency_id)?.code}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addRow}
              >
                {t('expenses.addRow')}
              </Button>
            </Box>

            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 150 }}>{t('common.category')}</TableCell>
                    <TableCell sx={{ minWidth: 200 }}>{t('expenses.purpose')}</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>{t('common.amount')}</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>{t('expenses.expenseDate')}</TableCell>
                    <TableCell sx={{ minWidth: 130 }}>{t('expenses.documentType')}</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>{t('expenses.supplier')}</TableCell>
                    <TableCell sx={{ minWidth: 130 }}>{t('expenses.documentNumber')}</TableCell>
                    <TableCell sx={{ minWidth: 100 }}>{t('expenses.taxable')}</TableCell>
                    <TableCell sx={{ minWidth: 200 }}>{t('common.comments')}</TableCell>
                    <TableCell sx={{ minWidth: 100 }}>{t('common.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expenseRows.map((row, index) => (
                    <TableRow key={row.id}>
                      {/* Category */}
                      <TableCell>
                        <FormControl size="small" fullWidth error={!!row.errors.category_id}>
                          <Select
                            value={row.category_id}
                            onChange={(e) => updateRow(row.id, 'category_id', e.target.value)}
                          >
                            <MenuItem value={0}>
                              <em>{t('expenses.selectCategory')}</em>
                            </MenuItem>
                            {categories.map((cat) => (
                              <MenuItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>

                      {/* Purpose */}
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          value={row.purpose}
                          onChange={(e) => updateRow(row.id, 'purpose', e.target.value)}
                          error={!!row.errors.purpose}
                          placeholder={t('expenses.enterPurpose')}
                        />
                      </TableCell>

                      {/* Amount */}
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          type="number"
                          value={row.amount || ''}
                          onChange={(e) => updateRow(row.id, 'amount', parseFloat(e.target.value) || 0)}
                          error={!!row.errors.amount}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>
                          }}
                        />
                      </TableCell>

                      {/* Expense Date */}
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          type="date"
                          value={row.expense_date}
                          onChange={(e) => updateRow(row.id, 'expense_date', e.target.value)}
                          error={!!row.errors.expense_date}
                          InputLabelProps={{ shrink: true }}
                        />
                      </TableCell>

                      {/* Document Type */}
                      <TableCell>
                        <FormControl size="small" fullWidth>
                          <Select
                            value={row.document_type}
                            onChange={(e) => updateRow(row.id, 'document_type', e.target.value)}
                          >
                            <MenuItem value="BOLETA">Boleta</MenuItem>
                            <MenuItem value="FACTURA">Factura</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>

                      {/* Supplier */}
                      <TableCell>
                        {row.document_type === 'BOLETA' ? (
                          <TextField
                            size="small"
                            fullWidth
                            value={row.boleta_supplier}
                            onChange={(e) => updateRow(row.id, 'boleta_supplier', e.target.value)}
                            error={!!row.errors.boleta_supplier}
                            placeholder={t('expenses.enterSupplier')}
                          />
                        ) : (
                          <FormControl size="small" fullWidth error={!!row.errors.factura_supplier_id}>
                            <Select
                              value={row.factura_supplier_id}
                              onChange={(e) => updateRow(row.id, 'factura_supplier_id', e.target.value)}
                            >
                              <MenuItem value={0}>
                                <em>{t('expenses.selectSupplier')}</em>
                              </MenuItem>
                              {suppliers.map((supplier) => (
                                <MenuItem key={supplier.id} value={supplier.id}>
                                  {supplier.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </TableCell>

                      {/* Document Number */}
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          value={row.document_number}
                          onChange={(e) => updateRow(row.id, 'document_number', e.target.value)}
                          placeholder={t('expenses.enterDocNumber')}
                        />
                      </TableCell>

                      {/* Taxable */}
                      <TableCell>
                        <FormControl size="small" fullWidth>
                          <Select
                            value={row.taxable}
                            onChange={(e) => updateRow(row.id, 'taxable', e.target.value)}
                          >
                            <MenuItem value="NO">{t('common.no')}</MenuItem>
                            <MenuItem value="SI">{t('common.yes')}</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>

                      {/* Comments */}
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          multiline
                          rows={1}
                          value={row.comments}
                          onChange={(e) => updateRow(row.id, 'comments', e.target.value)}
                          placeholder={t('expenses.enterComments')}
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeRow(row.id)}
                          disabled={expenseRows.length === 1}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              {t('expenses.bulkExpenseHelp')}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        {activeStep === 1 && (
          <Button
            onClick={() => setActiveStep(0)}
            disabled={loading}
          >
            {t('common.back')}
          </Button>
        )}
        {activeStep === 1 && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || expenseRows.length === 0}
          >
            {loading ? t('common.saving') : t('expenses.createAllExpenses')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BulkExpenseModal;

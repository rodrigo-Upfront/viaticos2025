import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
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
  Card,
  CardContent,
  Alert,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import FileAttachmentModal from '../components/modals/FileAttachmentModal';

interface TravelExpenseReport {
  id: number;
  prepayment_id: number;
  status: string;
  displayName: string;
  reason: string;
  country_name?: string;
  currency_code?: string;
  start_date?: string;
  end_date?: string;
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

interface BulkExpensePageProps {
  reports: TravelExpenseReport[];
  categories: Category[];
  countries: Country[];
  currencies: Currency[];
  suppliers: Supplier[];
  onSave: (expenses: BulkExpenseRow[], reportId: number) => Promise<void>;
  loading?: boolean;
}

const BulkExpensePage: React.FC<BulkExpensePageProps> = ({
  reports,
  categories,
  countries,
  currencies,
  suppliers,
  onSave,
  loading = false
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedReportId, setSelectedReportId] = useState<number>(0);
  const [expenseRows, setExpenseRows] = useState<BulkExpenseRow[]>([]);
  const [fileModal, setFileModal] = useState({
    open: false,
    rowId: '',
    currentFile: null as File | null
  });

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
        // Set defaults if available - match names to IDs
        if (selectedReport.country_name) {
          const country = countries.find(c => c.name === selectedReport.country_name);
          if (country) defaultRow.country_id = country.id;
        }
        if (selectedReport.currency_code) {
          const currency = currencies.find(c => c.code === selectedReport.currency_code);
          if (currency) defaultRow.currency_id = currency.id;
        }
        // Set expense date to start date of the travel period (safer default)
        defaultRow.expense_date = selectedReport.start_date || new Date().toISOString().split('T')[0];
      }
      setExpenseRows([defaultRow]);
    }
  }, [selectedReport, countries, currencies]);

  const createEmptyRow = (): BulkExpenseRow => {
    // Get country and currency from selected report
    let country_id = 0;
    let currency_id = 0;
    
    if (selectedReport) {
      if (selectedReport.country_name) {
        const country = countries.find(c => c.name === selectedReport.country_name);
        if (country) country_id = country.id;
      }
      if (selectedReport.currency_code) {
        const currency = currencies.find(c => c.code === selectedReport.currency_code);
        if (currency) currency_id = currency.id;
      }
    }

    return {
      id: uuidv4(),
      category_id: 0,
      purpose: '',
      amount: 0,
      expense_date: selectedReport?.start_date || new Date().toISOString().split('T')[0],
      document_type: 'BOLETA',
      boleta_supplier: '',
      factura_supplier_id: 0,
      document_number: '',
      taxable: 'NO',
      country_id,
      currency_id,
      comments: '',
      errors: {}
    };
  };

  const handleReportSelect = (reportId: number) => {
    setSelectedReportId(reportId);
    setActiveStep(1);
  };

  const addRow = () => {
    const newRow = createEmptyRow();
    setExpenseRows([...expenseRows, newRow]);
  };

  const removeRow = (rowId: string) => {
    if (expenseRows.length > 1) {
      setExpenseRows(expenseRows.filter(row => row.id !== rowId));
    }
  };

  const updateRow = (rowId: string, field: keyof BulkExpenseRow, value: any) => {
    setExpenseRows(expenseRows.map(row => {
      if (row.id === rowId) {
        const updatedRow = { ...row, [field]: value, errors: { ...row.errors, [field]: '' } };
        
        // Auto-set taxable field when document type changes
        if (field === 'document_type') {
          if (value === 'FACTURA') {
            updatedRow.taxable = 'NO'; // Default to NO for FACTURA
          } else if (value === 'BOLETA') {
            updatedRow.taxable = 'NO'; // BOLETA doesn't use taxable, but keep consistent
          }
        }
        
        return updatedRow;
      }
      return row;
    }));
  };

  const handleFileAttachment = (rowId: string) => {
    const row = expenseRows.find(r => r.id === rowId);
    setFileModal({
      open: true,
      rowId: rowId,
      currentFile: row?.document_file || null
    });
  };

  const handleFileModalClose = () => {
    setFileModal({
      open: false,
      rowId: '',
      currentFile: null
    });
  };

  const handleFileSelect = (file: File | null) => {
    if (fileModal.rowId) {
      updateRow(fileModal.rowId, 'document_file', file);
    }
    handleFileModalClose();
  };

  const applyDefaultsToAll = () => {
    if (expenseRows.length === 0) return;
    
    const firstRow = expenseRows[0];
    const defaultValues = {
      category_id: firstRow.category_id,
      document_type: firstRow.document_type,
      boleta_supplier: firstRow.boleta_supplier,
      factura_supplier_id: firstRow.factura_supplier_id,
      taxable: firstRow.taxable,
      country_id: firstRow.country_id,
      currency_id: firstRow.currency_id,
      expense_date: firstRow.expense_date || (selectedReport?.start_date || new Date().toISOString().split('T')[0])
    };

    const updatedRows = expenseRows.map((row, index) => {
      if (index === 0) return row; // Keep first row as is
      return {
        ...row,
        ...defaultValues,
        // Clear errors for the fields we're updating
        errors: {
          ...row.errors,
          category_id: '',
          document_type: '',
          boleta_supplier: '',
          factura_supplier_id: '',
          taxable: '',
          country_id: '',
          currency_id: '',
          expense_date: ''
        }
      };
    });

    setExpenseRows(updatedRows);
  };

  const validateRows = (): boolean => {
    let hasErrors = false;
    const updatedRows = expenseRows.map(row => {
      const errors: Record<string, string> = {};

      if (!row.category_id) errors.category_id = t('expenses.categoryRequired');
      if (!row.purpose.trim()) errors.purpose = t('expenses.purposeRequired');
      if (row.amount <= 0) errors.amount = t('expenses.amountRequired');
      if (!row.expense_date) {
        errors.expense_date = t('expenses.dateRequired');
      } else if (selectedReport && selectedReport.start_date && selectedReport.end_date) {
        // Validate expense date is within travel date range
        const expenseDate = new Date(row.expense_date);
        const startDate = new Date(selectedReport.start_date);
        const endDate = new Date(selectedReport.end_date);
        
        if (expenseDate < startDate || expenseDate > endDate) {
          errors.expense_date = t('expenses.dateOutOfRange', {
            startDate: selectedReport.start_date,
            endDate: selectedReport.end_date
          });
        }
      }
      // Country and currency are inherited from the selected report
      
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
      navigate('/expenses');
    } catch (error) {
      console.error('Error saving bulk expenses:', error);
    }
  };

  const handleBack = () => {
    if (activeStep === 1) {
      setActiveStep(0);
      setSelectedReportId(0);
      setExpenseRows([]);
    } else {
      navigate('/expenses');
    }
  };

  const availableReports = reports.filter(r => 
    r.status === 'PENDING' || r.status === 'pending' || r.status === 'REJECTED' || r.status === 'rejected'
  );

  // Check if any row has FACTURA document type to show taxable column
  const showTaxableColumn = expenseRows.some(row => row.document_type === 'FACTURA');

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with Breadcrumbs */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link color="inherit" href="/expenses" onClick={(e) => { e.preventDefault(); navigate('/expenses'); }}>
            {t('navigation.expenses')}
          </Link>
          <Typography color="text.primary">{t('expenses.createMultipleExpenses')}</Typography>
        </Breadcrumbs>
        
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" gutterBottom>
            {t('expenses.createMultipleExpenses')}
          </Typography>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            variant="outlined"
          >
            {activeStep === 1 ? t('common.back') : t('common.cancel')}
          </Button>
        </Box>

        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mt: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Step 1: Report Selection */}
      {activeStep === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('expenses.selectReportFirst')}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              {t('expenses.selectReportHelp')}
            </Typography>

            {availableReports.length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                {t('expenses.noAvailableReports')}
              </Alert>
            ) : (
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
                          {report.country_name || '-'}
                        </TableCell>
                        <TableCell>
                          {report.currency_code || '-'}
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
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Bulk Expense Entry */}
      {activeStep === 1 && selectedReport && (
        <Box>
          {/* Report Info Header */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">
                    {t('expenses.addingExpensesTo')}: {selectedReport.reason}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {selectedReport.country_name && (
                      <>{t('common.country')}: {selectedReport.country_name}</>
                    )}
                    {selectedReport.country_name && selectedReport.currency_code && ' | '}
                    {selectedReport.currency_code && (
                      <>{t('common.currency')}: {selectedReport.currency_code}</>
                    )}
                    {selectedReport.start_date && selectedReport.end_date && (
                      <>
                        {(selectedReport.country_name || selectedReport.currency_code) && ' | '}
                        {t('expenses.validDates')}: {selectedReport.start_date} - {selectedReport.end_date}
                      </>
                    )}
                  </Typography>
                </Box>
                <Box display="flex" gap={2}>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={addRow}
                  >
                    {t('expenses.addRow')}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={applyDefaultsToAll}
                    disabled={expenseRows.length <= 1}
                    color="secondary"
                    sx={{ display: 'none' }}
                  >
                    {t('expenses.applyDefaults')}
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSubmit}
                    disabled={loading || expenseRows.length === 0}
                  >
                    {loading ? t('common.saving') : t('common.save')}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Expense Table */}
          <Card>
            <CardContent>
              <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
                <Table size="small" sx={{ 
                  minWidth: showTaxableColumn ? 1000 : 900,
                  '& .MuiTableCell-root': {
                    padding: '8px 12px', // Reduced from default 16px
                    fontSize: '0.875rem'
                  },
                  '& .MuiTableHead .MuiTableCell-root': {
                    padding: '12px 12px',
                    fontWeight: 600
                  },
                  '& .MuiTextField-root': {
                    '& .MuiInputBase-input': {
                      padding: '6px 8px'
                    }
                  },
                  '& .MuiSelect-select': {
                    padding: '6px 8px !important'
                  },
                  '& .MuiFormControl-root': {
                    minHeight: 'auto'
                  }
                }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 60, position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                        #
                      </TableCell>
                      <TableCell sx={{ minWidth: 180 }}>{t('common.category')}</TableCell>
                      <TableCell sx={{ minWidth: 200 }}>{t('expenses.purpose')}</TableCell>
                      <TableCell sx={{ minWidth: 120 }}>{t('common.amount')}</TableCell>
                      <TableCell sx={{ minWidth: 150 }}>{t('expenses.expenseDate')}</TableCell>
                      <TableCell sx={{ minWidth: 130 }}>{t('expenses.documentType')}</TableCell>
                      <TableCell sx={{ minWidth: 180 }}>{t('expenses.supplier')}</TableCell>
                      <TableCell sx={{ minWidth: 150 }}>{t('expenses.documentNumber')}</TableCell>
                      {showTaxableColumn && (
                        <TableCell sx={{ minWidth: 100 }}>{t('expenses.taxable')}</TableCell>
                      )}
                      <TableCell sx={{ minWidth: 200 }}>{t('common.comments')}</TableCell>
                      <TableCell sx={{ width: 80, textAlign: 'center' }}>
                        <AttachFileIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                      </TableCell>
                      <TableCell sx={{ width: 60, textAlign: 'center' }}>
                        <DeleteIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expenseRows.map((row, index) => (
                      <TableRow key={row.id}>
                        {/* Row Number */}
                        <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                          <Chip label={index + 1} size="small" color="primary" variant="outlined" />
                        </TableCell>

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
                            helperText={row.errors.expense_date}
                            inputProps={{
                              min: selectedReport?.start_date,
                              max: selectedReport?.end_date
                            }}
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

                        {/* Taxable - Only show for FACTURA documents */}
                        {showTaxableColumn && (
                          <TableCell>
                            <FormControl size="small" fullWidth>
                              <Select
                                value={row.taxable}
                                onChange={(e) => updateRow(row.id, 'taxable', e.target.value)}
                                disabled={row.document_type !== 'FACTURA'}
                              >
                                <MenuItem value="NO">{t('common.no')}</MenuItem>
                                <MenuItem value="SI">{t('common.yes')}</MenuItem>
                              </Select>
                            </FormControl>
                          </TableCell>
                        )}

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

                        {/* File Attachment */}
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleFileAttachment(row.id)}
                              sx={{ 
                                bgcolor: row.document_file ? 'success.light' : 'grey.100',
                                color: row.document_file ? 'success.dark' : 'grey.600',
                                '&:hover': {
                                  bgcolor: row.document_file ? 'success.main' : 'grey.200'
                                }
                              }}
                            >
                              <AttachFileIcon />
                            </IconButton>
                            {row.document_file && (
                              <Typography variant="caption" noWrap sx={{ maxWidth: 80 }}>
                                {row.document_file.name}
                              </Typography>
                            )}
                          </Box>
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

              <Alert severity="info" sx={{ mt: 2 }}>
                {t('expenses.bulkExpenseHelp')}
              </Alert>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* File Attachment Modal */}
      <FileAttachmentModal
        open={fileModal.open}
        onClose={handleFileModalClose}
        onFileSelect={handleFileSelect}
        currentFile={fileModal.currentFile}
        rowId={fileModal.rowId}
      />
    </Box>
  );
};

export default BulkExpensePage;

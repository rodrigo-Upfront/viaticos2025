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
  Snackbar,
  Alert,
  CircularProgress,
  TextField,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Receipt as ReceiptIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ExpenseModal from '../components/forms/ExpenseModal';
import { currencyService, Currency } from '../services/currencyService';
import ExpenseViewModal from '../components/modals/ExpenseViewModal';
import ConfirmDialog from '../components/forms/ConfirmDialog';
import { expenseService, Expense as ApiExpense, ExpenseCreate } from '../services/expenseService';
import { categoryService, Category as ApiCategory } from '../services/categoryService';
import { supplierService, Supplier as ApiSupplier } from '../services/supplierService';
import { reportService, ExpenseReport as ApiReport } from '../services/reportService';
import { countryService, Country as ApiCountry } from '../services/countryService';

interface Expense {
  id?: number;
  category_id: number;
  category: string;
  travel_expense_report_id: number;
  travel_expense_report?: string;
  travel_expense_report_status?: string;
  purpose: string;
  document_type: 'Boleta' | 'Factura';
  boleta_supplier?: string;
  factura_supplier_id: number;
  factura_supplier?: string;
  expense_date: string;
  country_id: number;
  country: string;
  currency: string;
  amount: number;
  document_number: string;
  taxable: 'Si' | 'No';
  document_file?: string;
  comments?: string;
  status: 'pending' | 'in_process' | 'approved';
}

interface TravelExpenseReport {
  id: number;
  prepayment_id: number;
  status: string;
  displayName: string;
  reason: string;
}

interface Category {
  id: number;
  name: string;
  account: string;
  alertAmount: number;
}

interface Supplier {
  id: number;
  name: string;
  sapCode: string;
}

const ExpensesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Loading states
  const [loading, setLoading] = useState({
    expenses: true,
    categories: true,
    suppliers: true,
    reports: true,
    countries: true,
    action: false,
  });

  // Data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [travelExpenseReports, setTravelExpenseReports] = useState<TravelExpenseReport[]>([]);
  const [countries, setCountries] = useState<{ id: number; name: string }[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  // Dynamic filter options based on user's data
  const [filterOptions, setFilterOptions] = useState<{
    statuses: string[];
    categories: Array<{id: number; name: string}>;
    countries: Array<{id: number; name: string}>;
    reports: Array<{id: number; name: string}>;
  }>({
    statuses: [],
    categories: [],
    countries: [],
    reports: []
  });

  // Filters/search state
  const [searchPurpose, setSearchPurpose] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<number | ''>('');
  const [filterCountryId, setFilterCountryId] = useState<number | ''>('');
  const [filterReportId, setFilterReportId] = useState<number | ''>('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Load data on component mount
  useEffect(() => {
    loadExpenses();
    loadCategories();
    loadSuppliers();
    loadReports();
    loadCountries();
    loadCurrencies();
    loadFilterOptions();
  }, []);

  const [modal, setModal] = useState({
    open: false,
    mode: 'create' as 'create' | 'edit',
    expense: undefined as Expense | undefined
  });

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

  const [viewModal, setViewModal] = useState({
    open: false,
    expense: undefined as Expense | undefined
  });


  // Expense status labels
  const EXPENSE_STATUS_LABELS: Record<string, { en: string; es: string }> = {
    pending: { en: "Pending", es: "Pendiente" },
    in_process: { en: "In Process", es: "En Proceso" },
    approved: { en: "Approved", es: "Aprobado" },
    rejected: { en: "Rejected", es: "Rechazado" },
  };

  const getExpenseStatusLabel = (status: string) => {
    const lang = i18n.language?.startsWith('es') ? 'es' : 'en';
    const entry = EXPENSE_STATUS_LABELS[status.toLowerCase()];
    return entry ? entry[lang] : status;
  };

  // Helper functions to map between API and frontend formats
  const mapApiToFrontend = (apiExpense: ApiExpense): Expense => {
    const category = categories.find(c => c.id === apiExpense.category_id);
    const country = countries.find(c => c.id === apiExpense.country_id);
    const supplier = suppliers.find(s => s.id === apiExpense.factura_supplier_id);
    
    return {
      id: apiExpense.id,
      category_id: apiExpense.category_id,
      category: category?.name || apiExpense.category_name || 'Unknown',
      travel_expense_report_id: apiExpense.travel_expense_report_id,
      travel_expense_report: (apiExpense as any).travel_expense_report_name || null,
      travel_expense_report_status: (apiExpense as any).travel_expense_report_status,
      purpose: apiExpense.purpose,
      document_type: apiExpense.document_type as 'Boleta' | 'Factura',
      boleta_supplier: apiExpense.boleta_supplier,
      factura_supplier_id: apiExpense.factura_supplier_id || 0,
      factura_supplier: supplier?.name || apiExpense.factura_supplier_name,
      expense_date: apiExpense.expense_date,
      country_id: apiExpense.country_id,
      country: country?.name || apiExpense.country_name || 'Unknown',
      currency: apiExpense.currency_code || currencies.find(c => c.id === (apiExpense as any).currency_id)?.code || '',
      amount: parseFloat(apiExpense.amount),
      document_number: apiExpense.document_number,
      taxable: apiExpense.taxable as 'Si' | 'No',
      document_file: apiExpense.document_file,
      comments: apiExpense.comments,
      status: apiExpense.status.toLowerCase() as 'pending' | 'in_process' | 'approved',
    };
  };

  const mapFrontendToApi = (frontendExpense: Expense): ExpenseCreate => {
    const currency = currencies.find(c => c.code === frontendExpense.currency);
    const isReimbursement = frontendExpense.travel_expense_report_id === 0;
    return {
      category_id: frontendExpense.category_id,
      travel_expense_report_id: isReimbursement ? undefined as any : frontendExpense.travel_expense_report_id,
      purpose: frontendExpense.purpose,
      document_type: frontendExpense.document_type,
      boleta_supplier: frontendExpense.boleta_supplier,
      factura_supplier_id: frontendExpense.factura_supplier_id && frontendExpense.factura_supplier_id > 0 ? frontendExpense.factura_supplier_id : null,
      expense_date: frontendExpense.expense_date,
      // For reimbursement, send explicit currency; for report-linked it's ignored by backend
      currency_id: currency ? currency.id : undefined as any,
      amount: frontendExpense.amount,
      document_number: frontendExpense.document_number,
      taxable: frontendExpense.taxable,
      document_file: frontendExpense.document_file,
      comments: frontendExpense.comments,
      ...(isReimbursement ? { country_id: frontendExpense.country_id } : {})
    } as unknown as ExpenseCreate;
  };

  // Load functions
  const loadExpenses = async () => {
    try {
      setLoading(prev => ({ ...prev, expenses: true }));
      const response = await expenseService.getExpenses({
        search: searchPurpose || undefined,
        ...(filterCategoryId ? { category_id: filterCategoryId as number } : {} as any),
        ...(filterCountryId ? { country_id: filterCountryId as number } : {} as any),
        ...(filterReportId ? { report_id: filterReportId as number } : {} as any),
        ...(filterStartDate ? { start_date: filterStartDate } : {} as any),
        ...(filterEndDate ? { end_date: filterEndDate } : {} as any),
      } as any);
      const mappedExpenses = response.expenses.map(mapApiToFrontend);
      setExpenses(mappedExpenses);
    } catch (error) {
      console.error('Failed to load expenses:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load expenses',
        severity: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, expenses: false }));
    }
  };

  const loadCategories = async () => {
    try {
      setLoading(prev => ({ ...prev, categories: true }));
      const response = await categoryService.getCategories();
      const mappedCategories = response.categories.map((cat: ApiCategory) => ({
        id: cat.id,
        name: cat.name,
        account: cat.account,
        alertAmount: Number(cat.alert_amount)
      }));
      setCategories(mappedCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(prev => ({ ...prev, categories: false }));
    }
  };

  const loadSuppliers = async () => {
    try {
      setLoading(prev => ({ ...prev, suppliers: true }));
      const response = await supplierService.getSuppliers();
      const mappedSuppliers = response.suppliers.map((sup: ApiSupplier) => ({
        id: sup.id,
        name: sup.name,
        sapCode: sup.sap_code
      }));
      setSuppliers(mappedSuppliers);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    } finally {
      setLoading(prev => ({ ...prev, suppliers: false }));
    }
  };

  const loadReports = async () => {
    try {
      setLoading(prev => ({ ...prev, reports: true }));
      const response = await reportService.getReports();
      // Filter reports to only show those available for adding expenses
      // Reports in approval process or completed should not be available for new expenses
      const availableReports = response.reports.filter((report: ApiReport) => 
        report.status === 'PENDING' || report.status === 'REJECTED'
      );
      const mappedReports = availableReports.map((report: ApiReport) => ({
        id: report.id,
        prepayment_id: report.prepayment_id,
        status: report.status,
        displayName: `Report #${report.id} - ${report.reimbursement_reason || report.prepayment_reason || 'Travel'}`,
        reason: report.reimbursement_reason || report.prepayment_reason || 'No reason'
      }));
      setTravelExpenseReports(mappedReports);
    } catch (error) {
      console.error('Failed to load expense reports:', error);
    } finally {
      setLoading(prev => ({ ...prev, reports: false }));
    }
  };

  const loadCountries = async () => {
    try {
      setLoading(prev => ({ ...prev, countries: true }));
      const response = await countryService.getCountries();
      const mappedCountries = response.map((country: ApiCountry) => ({
        id: country.id,
        name: country.name,
      }));
      setCountries(mappedCountries);
    } catch (error) {
      console.error('Failed to load countries:', error);
    } finally {
      setLoading(prev => ({ ...prev, countries: false }));
    }
  };

  // CRUD operations
  const handleCreate = async () => {
    await Promise.all([loadCategories(), loadSuppliers(), loadReports(), loadCountries(), loadCurrencies()]);
    setModal({ open: true, mode: 'create', expense: undefined });
  };

  const handleCreateMultiple = () => {
    navigate('/expenses/bulk-create');
  };

  const handleEdit = async (expense: Expense) => {
    if (!canModifyExpense(expense)) {
      let message = 'Cannot edit this expense';
      if (expense.status === 'approved') {
        message = 'Cannot edit approved expenses';
      } else if (expense.status === 'in_process') {
        message = 'Cannot edit expenses that are being reviewed';
      } else if (expense.travel_expense_report_status) {
        const reportStatus = expense.travel_expense_report_status.toLowerCase();
        if (['supervisor_pending', 'accounting_pending', 'treasury_pending', 'funds_return_pending', 'review_return'].includes(reportStatus)) {
          message = 'Cannot edit expenses when their report is under approval';
        }
      }
      setSnackbar({
        open: true,
        message,
        severity: 'warning'
      });
      return;
    }
    
    // Ensure the latest data is available when opening the modal
    await Promise.all([loadCountries(), loadCategories(), loadSuppliers(), loadReports(), loadCurrencies()]);
    setModal({ open: true, mode: 'edit', expense });
  };

  const handleView = (expense: Expense) => {
    setViewModal({ open: true, expense });
  };

  const loadCurrencies = async () => {
    try {
      const data = await currencyService.getCurrencies();
      setCurrencies(data);
    } catch (error) {
      console.error('Failed to load currencies:', error);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const options = await expenseService.getFilterOptions();
      setFilterOptions(options);
    } catch (error) {
      console.error('Failed to load filter options:', error);
      // Fallback to current data if dynamic loading fails
      setFilterOptions(prev => ({
        ...prev,
        categories: categories.map(c => ({id: c.id, name: c.name})),
        countries: countries.map(c => ({id: c.id, name: c.name})),
        reports: travelExpenseReports.map(r => ({id: r.id, name: `Report #${r.id}`}))
      }));
    }
  };

  // Helper function to check if expense can be modified
  const canModifyExpense = (expense: Expense): boolean => {
    // Approved expenses and expenses in process (being reviewed) cannot be modified or deleted
    if (expense.status === 'approved' || expense.status === 'in_process') {
      return false;
    }
    
    // Also check if the associated travel expense report is in an approval process
    if (expense.travel_expense_report_status) {
      const reportStatus = expense.travel_expense_report_status.toLowerCase();
      // Block modification if report is in any approval stage
      const approvalStatuses = [
        'supervisor_pending', 'accounting_pending', 'treasury_pending',
        'funds_return_pending', 'review_return'
      ];
      if (approvalStatuses.includes(reportStatus)) {
        return false;
      }
    }
    
    return true;
  };

  const handleDelete = (expense: Expense) => {
    if (!canModifyExpense(expense)) {
      let message = 'Cannot delete this expense';
      if (expense.status === 'approved') {
        message = 'Cannot delete approved expenses';
      } else if (expense.status === 'in_process') {
        message = 'Cannot delete expenses that are being reviewed';
      } else if (expense.travel_expense_report_status) {
        const reportStatus = expense.travel_expense_report_status.toLowerCase();
        if (['supervisor_pending', 'accounting_pending', 'treasury_pending', 'funds_return_pending', 'review_return'].includes(reportStatus)) {
          message = 'Cannot delete expenses when their report is under approval';
        }
      }
      setSnackbar({
        open: true,
        message,
        severity: 'warning'
      });
      return;
    }

    setConfirmDialog({
      open: true,
      title: 'Delete Expense',
      message: `Are you sure you want to delete the expense for "${expense.purpose}"? This action cannot be undone.`,
      onConfirm: async () => {
        if (!expense.id) return;
        
        try {
          setLoading(prev => ({ ...prev, action: true }));
          await expenseService.deleteExpense(expense.id);
          setExpenses(prev => prev.filter(e => e.id !== expense.id));
          setSnackbar({
            open: true,
            message: 'Expense deleted successfully',
            severity: 'success'
          });
        } catch (error) {
          console.error('Failed to delete expense:', error);
          setSnackbar({
            open: true,
            message: 'Failed to delete expense',
            severity: 'error'
          });
        } finally {
          setLoading(prev => ({ ...prev, action: false }));
        }
      }
    });
  };

  const uploadFile = async (expenseId: number, file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await expenseService.uploadFile(expenseId, formData);
    return response.filename;
  };

  const handleSave = async (expenseData: Expense, file?: File) => {
    try {
      setLoading(prev => ({ ...prev, action: true }));
      let savedExpense: any;
      
      if (modal.mode === 'create') {
        const apiData = mapFrontendToApi(expenseData);
        savedExpense = await expenseService.createExpense(apiData);
        
        // Upload file if provided
        if (file) {
          await uploadFile(savedExpense.id, file);
          // Refetch the expense to get updated file info
          savedExpense = await expenseService.getExpense(savedExpense.id);
        }
        
        const mappedExpense = mapApiToFrontend(savedExpense);
        setExpenses(prev => [...prev, mappedExpense]);
        setSnackbar({
          open: true,
          message: 'Expense created successfully',
          severity: 'success'
        });
      } else if (expenseData.id) {
        const apiData = mapFrontendToApi(expenseData);
        savedExpense = await expenseService.updateExpense(expenseData.id, apiData);
        
        // Upload file if provided
        if (file) {
          await uploadFile(expenseData.id, file);
          // Refetch the expense to get updated file info
          savedExpense = await expenseService.getExpense(expenseData.id);
        }
        
        const mappedExpense = mapApiToFrontend(savedExpense);
        setExpenses(prev => prev.map(e => e.id === expenseData.id ? mappedExpense : e));
        setSnackbar({
          open: true,
          message: 'Expense updated successfully',
          severity: 'success'
        });
      }
    } catch (error: any) {
      console.error('Failed to save expense:', error);
      const errorMessage = error?.response?.data?.detail || `Failed to ${modal.mode === 'create' ? 'create' : 'update'} expense`;
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    } finally {
      setLoading(prev => ({ ...prev, action: false }));
    }
  };


  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          {t('navigation.expenses')}
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
          >
            {t('expenses.createExpense')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleCreateMultiple}
            color="primary"
          >
            {t('expenses.createMultiple')}
          </Button>
        </Box>
      </Box>

      {/* Search and filters */}
      <Box display="flex" gap={2} alignItems="center" mb={2}>
        <TextField
          size="small"
          placeholder={t('expenses.searchPurpose')}
          value={searchPurpose}
          onChange={(e) => setSearchPurpose(e.target.value)}
          sx={{ minWidth: 240 }}
        />
        <TextField
          select
          size="small"
          label={t('common.category')}
          value={filterCategoryId}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
          sx={{ minWidth: 200 }}
          SelectProps={{ native: true }}
        >
          <option value=""></option>
          {filterOptions.categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t('common.country')}
          value={filterCountryId}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterCountryId(e.target.value === '' ? '' : Number(e.target.value))}
          sx={{ minWidth: 200 }}
          SelectProps={{ native: true }}
        >
          <option value=""></option>
          {filterOptions.countries.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t('common.report')}
          value={filterReportId}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterReportId(e.target.value === '' ? '' : Number(e.target.value))}
          sx={{ minWidth: 200 }}
          SelectProps={{ native: true }}
        >
          <option value=""></option>
          {filterOptions.reports.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </TextField>
        <TextField
          label={t('expenses.from')}
          type="date"
          size="small"
          value={filterStartDate}
          onChange={(e) => setFilterStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label={t('expenses.to')}
          type="date"
          size="small"
          value={filterEndDate}
          onChange={(e) => setFilterEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="outlined" onClick={loadExpenses}>{t('expenses.apply')}</Button>
        <Button variant="text" onClick={() => { setSearchPurpose(''); setFilterCategoryId(''); setFilterCountryId(''); setFilterReportId(''); setFilterStartDate(''); setFilterEndDate(''); loadExpenses(); }}>{t('expenses.reset')}</Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('tables.id')}</TableCell>
              <TableCell>{t('common.category')}</TableCell>
              <TableCell>{t('expenses.purpose')}</TableCell>
              <TableCell>{t('common.report')}</TableCell>
              <TableCell>{t('common.amount')}</TableCell>
              <TableCell>{t('common.date')}</TableCell>
              <TableCell>{t('expenses.documentType')}</TableCell>
              <TableCell>{t('common.status')}</TableCell>
              <TableCell>{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading.expenses ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Loading expenses...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No expenses found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{expense.id}</TableCell>
                  <TableCell>{expense.category}</TableCell>
                  <TableCell>{expense.purpose}</TableCell>
                  <TableCell>
                    {expense.travel_expense_report ? (
                      expense.travel_expense_report
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{expense.currency} {expense.amount.toLocaleString()}</TableCell>
                  <TableCell>{expense.expense_date}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <ReceiptIcon fontSize="small" sx={{ mr: 1 }} />
                      {expense.document_type}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getExpenseStatusLabel(expense.status)}
                      color={expense.status.toLowerCase() === 'approved' ? 'success' : expense.status.toLowerCase() === 'pending' ? 'warning' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleView(expense)}
                      color="info"
                      disabled={loading.action}
                    >
                      <ViewIcon />
                    </IconButton>
                    {canModifyExpense(expense) && (
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(expense)}
                        color="primary"
                        disabled={loading.action}
                        title="Edit expense"
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                    {canModifyExpense(expense) && (
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(expense)}
                        color="error"
                        disabled={loading.action}
                        title="Delete expense"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Expense Modal */}
      <ExpenseModal
        open={modal.open}
        onClose={() => setModal({ open: false, mode: 'create', expense: undefined })}
        onSave={handleSave}
        expense={modal.expense}
        mode={modal.mode}
        categories={categories}
        suppliers={suppliers}
        travelExpenseReports={travelExpenseReports}
        countries={countries}
        currencies={currencies}
        loading={loading.action}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        severity="error"
        confirmText="Delete"
      />

      {/* Expense View Modal */}
      <ExpenseViewModal
        open={viewModal.open}
        onClose={() => setViewModal({ open: false, expense: undefined })}
        expense={viewModal.expense}
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

export default ExpensesPage;

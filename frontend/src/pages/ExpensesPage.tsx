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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Receipt as ReceiptIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import ExpenseModal from '../components/forms/ExpenseModal';
import ExpenseViewModal from '../components/modals/ExpenseViewModal';
import ConfirmDialog from '../components/forms/ConfirmDialog';
import { expenseService, Expense as ApiExpense } from '../services/expenseService';
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
  const { t } = useTranslation();

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
  const [countries, setCountries] = useState<{ id: number; name: string; currency: string }[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Load data on component mount
  useEffect(() => {
    loadExpenses();
    loadCategories();
    loadSuppliers();
    loadReports();
    loadCountries();
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
      purpose: apiExpense.purpose,
      document_type: apiExpense.document_type as 'Boleta' | 'Factura',
      boleta_supplier: apiExpense.boleta_supplier,
      factura_supplier_id: apiExpense.factura_supplier_id || 0,
      factura_supplier: supplier?.name || apiExpense.factura_supplier_name,
      expense_date: apiExpense.expense_date,
      country_id: apiExpense.country_id,
      country: country?.name || apiExpense.country_name || 'Unknown',
      currency: apiExpense.currency,
      amount: parseFloat(apiExpense.amount),
      document_number: apiExpense.document_number,
      taxable: apiExpense.taxable as 'Si' | 'No',
      document_file: apiExpense.document_file,
      comments: apiExpense.comments,
      status: apiExpense.status as 'pending' | 'in_process' | 'approved',
    };
  };

  const mapFrontendToApi = (frontendExpense: Expense) => {
    return {
      category_id: frontendExpense.category_id,
      travel_expense_report_id: frontendExpense.travel_expense_report_id,
      purpose: frontendExpense.purpose,
      document_type: frontendExpense.document_type,
      boleta_supplier: frontendExpense.boleta_supplier,
      factura_supplier_id: frontendExpense.factura_supplier_id && frontendExpense.factura_supplier_id > 0 ? frontendExpense.factura_supplier_id : null,
      expense_date: frontendExpense.expense_date,
      country_id: frontendExpense.country_id,
      currency: frontendExpense.currency,
      amount: frontendExpense.amount,
      document_number: frontendExpense.document_number,
      taxable: frontendExpense.taxable,
      document_file: frontendExpense.document_file,
      comments: frontendExpense.comments,
    };
  };

  // Load functions
  const loadExpenses = async () => {
    try {
      setLoading(prev => ({ ...prev, expenses: true }));
      const response = await expenseService.getExpenses();
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
      const mappedReports = response.reports.map((report: ApiReport) => ({
        id: report.id,
        prepayment_id: report.prepayment_id,
        status: report.status,
        displayName: `Report #${report.id} - ${report.prepayment_reason || 'Travel'} (Prepayment #${report.prepayment_id})`
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
        currency: country.currency,
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
    await Promise.all([loadCategories(), loadSuppliers(), loadReports(), loadCountries()]);
    setModal({ open: true, mode: 'create', expense: undefined });
  };

  const handleEdit = async (expense: Expense) => {
    // Ensure the latest data is available when opening the modal
    await Promise.all([loadCountries(), loadCategories(), loadSuppliers(), loadReports()]);
    setModal({ open: true, mode: 'edit', expense });
  };

  const handleView = (expense: Expense) => {
    setViewModal({ open: true, expense });
  };

  const handleDelete = (expense: Expense) => {
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

  const handleSave = async (expenseData: Expense) => {
    try {
      setLoading(prev => ({ ...prev, action: true }));
      
      if (modal.mode === 'create') {
        const apiData = mapFrontendToApi(expenseData);
        const newExpense = await expenseService.createExpense(apiData);
        const mappedExpense = mapApiToFrontend(newExpense);
        setExpenses(prev => [...prev, mappedExpense]);
        setSnackbar({
          open: true,
          message: 'Expense created successfully',
          severity: 'success'
        });
      } else if (expenseData.id) {
        const apiData = mapFrontendToApi(expenseData);
        const updatedExpense = await expenseService.updateExpense(expenseData.id, apiData);
        const mappedExpense = mapApiToFrontend(updatedExpense);
        setExpenses(prev => prev.map(e => e.id === expenseData.id ? mappedExpense : e));
        setSnackbar({
          open: true,
          message: 'Expense updated successfully',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Failed to save expense:', error);
      setSnackbar({
        open: true,
        message: `Failed to ${modal.mode === 'create' ? 'create' : 'update'} expense`,
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
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          {t('common.create')} Expense
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Purpose</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Document Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading.expenses ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Loading expenses...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
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
                      label={expense.status}
                      color={expense.status === 'approved' ? 'success' : expense.status === 'pending' ? 'warning' : 'default'}
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
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(expense)}
                      color="primary"
                      disabled={loading.action}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(expense)}
                      color="error"
                      disabled={loading.action}
                    >
                      <DeleteIcon />
                    </IconButton>
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

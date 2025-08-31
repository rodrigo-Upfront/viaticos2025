import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Typography,
  FormControlLabel,
  Switch,
  IconButton,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';
import apiClient from '../../services/apiClient';
import { Currency } from '../../services/currencyService';

interface Expense {
  id?: number;
  category_id: number;
  category: string; // For display
  travel_expense_report_id: number;
  travel_expense_report?: string; // For display
  purpose: string;
  document_type: 'Boleta' | 'Factura';
  boleta_supplier?: string;
  factura_supplier_id: number;
  factura_supplier?: string; // For display
  expense_date: string;
  country_id: number;
  country: string; // For display
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
  displayName: string; // For dropdown display
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

interface ExpenseModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (expense: Expense) => void;
  expense?: Expense;
  mode: 'create' | 'edit';
  categories: Category[];
  suppliers: Supplier[];
  travelExpenseReports: TravelExpenseReport[];
  countries?: { id: number; name: string }[];
  currencies?: Currency[];
  loading?: boolean;
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({
  open,
  onClose,
  onSave,
  expense,
  mode,
  categories,
  suppliers,
  travelExpenseReports,
  countries = [],
  currencies = [],
  loading = false
}) => {
  const [formData, setFormData] = useState<Expense>({
    category_id: 0,
    category: '',
    travel_expense_report_id: -1,
    travel_expense_report: '',
    purpose: '',
    document_type: 'Boleta',
    boleta_supplier: '',
    factura_supplier_id: 0,
    factura_supplier: '',
    expense_date: '',
    country_id: 1,
    country: 'Peru',
    currency: 'PEN',
    amount: 0,
    document_number: '',
    taxable: 'No',
    document_file: '',
    comments: '',
    status: 'pending',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [travelDates, setTravelDates] = useState<{ start_date?: string; end_date?: string }>({});

  const fetchTravelDatesForReport = async (reportId: number) => {
    console.log('Fetching travel dates for report:', reportId);
    try {
      const response = await apiClient.get(`/expense-reports/${reportId}`);
      const reportDetails = response.data;
      console.log('Report details received:', reportDetails);
      console.log('Available fields:', Object.keys(reportDetails));
      console.log('start_date:', reportDetails.start_date);
      console.log('end_date:', reportDetails.end_date);
      
      const dates = {
        start_date: reportDetails.start_date,
        end_date: reportDetails.end_date
      };
      console.log('Setting travel dates:', dates);
      setTravelDates(dates);
      
      // Validate expense date immediately after loading travel dates
      if (formData.expense_date) {
        const dateError = validateExpenseDateWithDates(formData.expense_date, dates);
        console.log('Date validation after fetch:', dateError);
        if (dateError) {
          setErrors(prev => ({
            ...prev,
            expense_date: dateError
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch travel dates:', error);
      setTravelDates({});
    }
  };

  useEffect(() => {
    if (expense && mode === 'edit') {
      setFormData(expense);
      // Fetch travel dates for the existing expense's report
      if (expense.travel_expense_report_id > 0) {
        fetchTravelDatesForReport(expense.travel_expense_report_id);
      } else {
        setTravelDates({}); // Clear travel dates for reimbursement
      }
    } else {
      setFormData({
        category_id: 0,
        category: '',
        travel_expense_report_id: 0,
        travel_expense_report: '',
        purpose: '',
        document_type: 'Boleta',
        boleta_supplier: '',
        factura_supplier_id: 0,
        factura_supplier: '',
        expense_date: '',
        country_id: 1,
        country: 'Select a travel expense report',
        currency: '',
        amount: 0,
        document_number: '',
        taxable: 'No',
        document_file: '',
        comments: '',
        status: 'pending',
      });
      setTravelDates({}); // Clear travel dates for new expense
    }
    setErrors({});
    setSelectedFile(null);
  }, [expense, mode, open]);

  const handleChange = (field: keyof Expense) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'amount' ? parseFloat(event.target.value) || 0 : event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Special validation for expense_date
    if (field === 'expense_date') {
      const dateError = validateExpenseDate(value as string);
      setErrors(prev => ({
        ...prev,
        expense_date: dateError || ''
      }));
    } else {
      // Clear error when user starts typing for other fields
      if (errors[field]) {
        setErrors(prev => ({
          ...prev,
          [field]: ''
        }));
      }
    }
  };

  const handleSelectChange = (field: keyof Expense) => (event: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleCategoryChange = (event: any) => {
    const categoryId = event.target.value;
    const selectedCategory = categories.find(c => c.id === categoryId);
    setFormData(prev => ({
      ...prev,
      category_id: categoryId,
      category: selectedCategory?.name || ''
    }));
    if (errors.category_id) {
      setErrors(prev => ({
        ...prev,
        category_id: ''
      }));
    }
  };

  const handleSupplierChange = (event: any) => {
    const supplierId = event.target.value;
    const selectedSupplier = suppliers.find(s => s.id === supplierId);
    setFormData(prev => ({
      ...prev,
      factura_supplier_id: supplierId,
      factura_supplier: selectedSupplier?.name || ''
    }));
    if (errors.factura_supplier_id) {
      setErrors(prev => ({
        ...prev,
        factura_supplier_id: ''
      }));
    }
  };

  const handleCountryChange = (event: any) => {
    const countryId = event.target.value;
    const selectedCountry = countries.find(c => c.id === countryId);
    setFormData(prev => ({
      ...prev,
      country_id: countryId,
      country: selectedCountry?.name || prev.country,
      currency: prev.currency,
    }));
    if ((errors as any).country_id) {
      setErrors(prev => ({
        ...prev,
        country_id: ''
      }));
    }
  };

  const handleTravelReportChange = async (event: any) => {
    const reportId = event.target.value;
    const selectedReport = travelExpenseReports.find(r => r.id === reportId);
    
    // Fetch the travel expense report details to get country/currency info
    if (reportId > 0) {
      try {
        const response = await apiClient.get(`/expense-reports/${reportId}`);
        const reportDetails = response.data;
        
        // Store travel dates for validation
        fetchTravelDatesForReport(reportId);
        
        setFormData(prev => ({
          ...prev,
          travel_expense_report_id: reportId,
          travel_expense_report: selectedReport?.displayName || '',
          country: reportDetails.prepayment_destination || 'Country not found',
          currency: reportDetails.prepayment_currency || 'Currency not found'
        }));
      } catch (error) {
        setFormData(prev => ({
          ...prev,
          travel_expense_report_id: reportId,
          travel_expense_report: selectedReport?.displayName || '',
          country: 'Error loading country',
          currency: 'Error loading currency'
        }));
      }
    }
    
    if (errors.travel_expense_report_id) {
      setErrors(prev => ({
        ...prev,
        travel_expense_report_id: ''
      }));
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFormData(prev => ({
        ...prev,
        document_file: file.name
      }));
    }
  };

  const handleFileDownload = (filename: string) => {
    // Placeholder for file download functionality
    console.log('Download file:', filename);
    
    // Create a temporary download link for demonstration
    // In a real application, this would call the backend API
    const link = document.createElement('a');
    link.href = '#'; // This would be the actual file URL from backend
    link.download = filename;
    link.click();
    
    alert(`Download functionality not yet implemented for: ${filename}\n\nIn a real application, this would download the file from the server.`);
  };

  const validateExpenseDateWithDates = (date: string, dates: { start_date?: string; end_date?: string }): string | null => {
    if (!date) return 'Expense date is required';
    
    // If it's a prepayment report, validate against travel dates
    if (formData.travel_expense_report_id > 0 && dates.start_date && dates.end_date) {
      const expenseDate = new Date(date);
      const startDate = new Date(dates.start_date);
      const endDate = new Date(dates.end_date);
      
      if (expenseDate < startDate || expenseDate > endDate) {
        return `Expense date must be between ${dates.start_date} and ${dates.end_date}`;
      }
    }
    
    return null;
  };

  const validateExpenseDate = (date: string): string | null => {
    return validateExpenseDateWithDates(date, travelDates);
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.category_id || formData.category_id === 0) {
      newErrors.category_id = 'Category is required';
    }

    if (!formData.travel_expense_report_id || formData.travel_expense_report_id <= 0) {
      newErrors.travel_expense_report_id = 'Travel expense report is required';
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Purpose is required';
    }

    if (formData.document_type === 'Boleta' && !formData.boleta_supplier?.trim()) {
      newErrors.boleta_supplier = 'Supplier name is required for Boleta';
    }

    if (formData.document_type === 'Factura' && (!formData.factura_supplier_id || formData.factura_supplier_id === 0)) {
      newErrors.factura_supplier_id = 'Supplier is required for Factura';
    }

    // Validate expense date with travel date constraints
    const dateError = validateExpenseDate(formData.expense_date);
    if (dateError) {
      newErrors.expense_date = dateError;
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.document_number.trim()) {
      newErrors.document_number = 'Document number is required';
    }



    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    console.log('UPDATE CLICKED - Form data:', formData.expense_date, 'Travel dates:', travelDates);
    
    // If travel dates aren't loaded for a prepayment report, block the save
    if (formData.travel_expense_report_id > 0 && (!travelDates.start_date || !travelDates.end_date)) {
      setErrors({ expense_date: 'Loading travel dates... Please wait and try again.' });
      return;
    }
    
    // Force validation to run and check result immediately
    const newErrors: { [key: string]: string } = {};

    if (!formData.category_id || formData.category_id === 0) {
      newErrors.category_id = 'Category is required';
    }

    if (!formData.travel_expense_report_id || formData.travel_expense_report_id <= 0) {
      newErrors.travel_expense_report_id = 'Travel expense report is required';
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Purpose is required';
    }

    if (formData.document_type === 'Boleta' && !formData.boleta_supplier?.trim()) {
      newErrors.boleta_supplier = 'Supplier name is required for Boleta';
    }

    if (formData.document_type === 'Factura' && (!formData.factura_supplier_id || formData.factura_supplier_id === 0)) {
      newErrors.factura_supplier_id = 'Supplier is required for Factura';
    }

    // Validate expense date with travel date constraints
    const dateError = validateExpenseDate(formData.expense_date);
    if (dateError) {
      newErrors.expense_date = dateError;
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.document_number.trim()) {
      newErrors.document_number = 'Document number is required';
    }



    // Update errors state
    setErrors(newErrors);
    
    // Only proceed if no errors
    if (Object.keys(newErrors).length === 0) {
      console.log('Validation passed, calling onSave');
      onSave(formData);
      onClose();
    } else {
      console.log('Validation BLOCKED save. Errors:', newErrors);
    }
    // If there are errors, do nothing - the form will show the errors
  };

  const handleClose = () => {
    setFormData({
      category_id: 0,
      category: '',
      travel_expense_report_id: 0,
      travel_expense_report: '',
      purpose: '',
      document_type: 'Boleta',
      boleta_supplier: '',
      factura_supplier_id: 0,
      factura_supplier: '',
      expense_date: '',
      country_id: 1,
      country: 'Select a travel expense report',
      currency: '',
      amount: 0,
      document_number: '',
      taxable: 'No',
      document_file: '',
      comments: '',
      status: 'pending',
    });
    setErrors({});
    setSelectedFile(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === 'create' ? 'Create New Expense' : 'Edit Expense'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <FormControl fullWidth margin="normal" error={!!errors.travel_expense_report_id} required>
            <InputLabel>Travel Expense Report</InputLabel>
            <Select
              value={formData.travel_expense_report_id}
              onChange={handleTravelReportChange}
              label="Travel Expense Report"
            >
              <MenuItem value={-1} disabled>
                <em>Select a travel expense report</em>
              </MenuItem>
              {travelExpenseReports.map((report) => (
                <MenuItem key={report.id} value={report.id}>
                  {report.displayName}
                </MenuItem>
              ))}
            </Select>
            {errors.travel_expense_report_id && (
              <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5, ml: 2 }}>
                {errors.travel_expense_report_id}
              </Box>
            )}
          </FormControl>

          <FormControl fullWidth margin="normal" error={!!errors.category_id} required>
            <InputLabel>Expense Category</InputLabel>
            <Select
              value={formData.category_id}
              onChange={handleCategoryChange}
              label="Expense Category"
            >
              <MenuItem value={0}>
                <em>Select a category</em>
              </MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
            {errors.category_id && (
              <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5, ml: 2 }}>
                {errors.category_id}
              </Box>
            )}
          </FormControl>

          <TextField
            fullWidth
            label="Purpose"
            value={formData.purpose}
            onChange={handleChange('purpose')}
            error={!!errors.purpose}
            helperText={errors.purpose}
            margin="normal"
            required
          />

          <FormControl fullWidth margin="normal" required>
            <InputLabel>Document Type</InputLabel>
            <Select
              value={formData.document_type}
              onChange={handleSelectChange('document_type')}
              label="Document Type"
            >
              <MenuItem value="Boleta">Boleta</MenuItem>
              <MenuItem value="Factura">Factura</MenuItem>
            </Select>
          </FormControl>

          {formData.document_type === 'Boleta' && (
            <TextField
              fullWidth
              label="Supplier Name"
              value={formData.boleta_supplier}
              onChange={handleChange('boleta_supplier')}
              error={!!errors.boleta_supplier}
              helperText={errors.boleta_supplier}
              margin="normal"
              required
            />
          )}

          {formData.document_type === 'Factura' && (
            <>
              <FormControl fullWidth margin="normal" error={!!errors.factura_supplier_id} required>
                <InputLabel>Factura Supplier</InputLabel>
                <Select
                  value={formData.factura_supplier_id}
                  onChange={handleSupplierChange}
                  label="Factura Supplier"
                >
                  <MenuItem value={0}>
                    <em>Select a supplier</em>
                  </MenuItem>
                  {suppliers.map((supplier) => (
                    <MenuItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.factura_supplier_id && (
                  <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5, ml: 2 }}>
                    {errors.factura_supplier_id}
                  </Box>
                )}
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.taxable === 'Si'}
                    onChange={(e) => setFormData(prev => ({ ...prev, taxable: e.target.checked ? 'Si' : 'No' }))}
                  />
                }
                label="Taxable"
                sx={{ mt: 2 }}
              />
            </>
          )}

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              label="Expense Date"
              type="date"
              value={formData.expense_date}
              onChange={handleChange('expense_date')}
              error={!!errors.expense_date}
              helperText={errors.expense_date}
              InputLabelProps={{
                shrink: true,
              }}
              required
            />

            <TextField
              fullWidth
              label="Document Number"
              value={formData.document_number}
              onChange={handleChange('document_number')}
              error={!!errors.document_number}
              helperText={errors.document_number}
              required
            />
          </Box>

          {/* Country display/edit */}
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Country</InputLabel>
              <Select
                value={formData.country_id}
                onChange={handleCountryChange}
                label="Country"
                disabled={formData.travel_expense_report_id > 0}
              >
                <MenuItem value={0}><em>Select a country</em></MenuItem>
                {countries.map((country) => (
                  <MenuItem key={country.id} value={country.id}>{country.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={handleChange('amount')}
              error={!!errors.amount}
              helperText={errors.amount}
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">{formData.currency}</InputAdornment>,
              }}
              sx={{ flex: 1 }}
            />

            {/* Currency selection */}
            <FormControl fullWidth sx={{ flex: 1 }}>
              <InputLabel>Currency</InputLabel>
              <Select
                value={formData.currency || ''}
                onChange={handleSelectChange('currency')}
                label="Currency"
                disabled={formData.travel_expense_report_id > 0}
              >
                <MenuItem value=""><em>Select currency</em></MenuItem>
                {currencies.map((c) => (
                  <MenuItem key={c.id} value={c.code}>{c.code} - {c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <TextField
            fullWidth
            label="Comments"
            value={formData.comments}
            onChange={handleChange('comments')}
            margin="normal"
            multiline
            rows={3}
            placeholder="Additional comments about this expense..."
          />

          <Box sx={{ mt: 2 }}>
            <InputLabel sx={{ mb: 1 }}>Document File (Optional)</InputLabel>
            <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column', alignItems: 'flex-start' }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<InputAdornment position="start">📎</InputAdornment>}
              >
                Choose File
                <input
                  type="file"
                  hidden
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                />
              </Button>
              
              {/* Show existing file from expense (when editing) */}
              {mode === 'edit' && expense?.document_file && (
                <Box 
                  display="flex" 
                  alignItems="center" 
                  sx={{ 
                    cursor: 'pointer', 
                    p: 1, 
                    border: 1, 
                    borderColor: 'divider', 
                    borderRadius: 1,
                    width: '100%',
                    '&:hover': { 
                      bgcolor: 'action.hover',
                      borderColor: 'primary.main'
                    }
                  }}
                  onClick={() => handleFileDownload(expense.document_file!)}
                >
                  <DocumentIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="primary" sx={{ fontWeight: 'medium' }}>
                      {expense.document_file}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Existing file • Click to download
                    </Typography>
                  </Box>
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileDownload(expense.document_file!);
                    }}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
              
              {/* Show newly selected file */}
              {selectedFile && selectedFile.name !== expense?.document_file && (
                <Box display="flex" alignItems="center" sx={{ mt: 1 }}>
                  <DocumentIcon sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 'medium' }}>
                    {selectedFile.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    (New file selected)
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit" disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExpenseModal;

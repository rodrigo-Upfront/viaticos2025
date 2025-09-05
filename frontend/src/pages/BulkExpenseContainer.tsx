import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import BulkExpensePage from './BulkExpensePage';
import { expenseService, ExpenseCreate } from '../services/expenseService';
import { categoryService, Category as ApiCategory } from '../services/categoryService';
import { supplierService, Supplier as ApiSupplier } from '../services/supplierService';
import { reportService, ExpenseReport as ApiReport } from '../services/reportService';
import { countryService, Country as ApiCountry } from '../services/countryService';
import { currencyService, Currency } from '../services/currencyService';

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

const BulkExpenseContainer: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
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

  const [data, setData] = useState<{
    reports: TravelExpenseReport[];
    categories: ApiCategory[];
    countries: ApiCountry[];
    currencies: Currency[];
    suppliers: ApiSupplier[];
  }>({
    reports: [],
    categories: [],
    countries: [],
    currencies: [],
    suppliers: []
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [reportsResponse, categoriesResponse, countries, currencies, suppliersResponse] = await Promise.all([
        reportService.getReports(),
        categoryService.getCategories(),
        countryService.getCountries(),
        currencyService.getCurrencies(),
        supplierService.getSuppliers()
      ]);

      // Filter reports to only show those available for adding expenses
      const availableReports = reportsResponse.reports.filter((report: ApiReport) => 
        report.status === 'PENDING' || report.status === 'REJECTED'
      );
      
      const mappedReports: TravelExpenseReport[] = availableReports.map((report: ApiReport) => ({
        id: report.id,
        prepayment_id: report.prepayment_id,
        status: report.status,
        displayName: report.prepayment_reason || report.reimbursement_reason || `Report ${report.id}`,
        reason: report.prepayment_reason || report.reimbursement_reason || `Report ${report.id}`,
        country_name: report.prepayment_destination || report.reimbursement_country,
        currency_code: report.currency,
        start_date: report.start_date,
        end_date: report.end_date
      }));

      setData({
        reports: mappedReports,
        categories: categoriesResponse.categories,
        countries: countries, // This returns Country[] directly
        currencies: currencies, // This returns Currency[] directly  
        suppliers: suppliersResponse.suppliers
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSave = async (expenseRows: BulkExpenseRow[], reportId: number) => {
    try {
      setActionLoading(true);
      
      // Create all expenses
      for (const row of expenseRows) {
        const apiData: ExpenseCreate = {
          category_id: row.category_id,
          travel_expense_report_id: reportId,
          purpose: row.purpose,
          document_type: row.document_type,
          boleta_supplier: row.document_type === 'BOLETA' ? row.boleta_supplier : undefined,
          factura_supplier_id: row.document_type === 'FACTURA' ? row.factura_supplier_id : undefined,
          expense_date: row.expense_date,
          currency_id: row.currency_id,
          amount: row.amount,
          document_number: row.document_number || '',
          taxable: row.taxable,
          comments: row.comments || ''
        };
        
        await expenseService.createExpense(apiData);
      }
      
    } catch (error) {
      console.error('Failed to create bulk expenses:', error);
      throw error;
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Box textAlign="center">
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="body2" color="textSecondary">
            {t('common.loading')}...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <BulkExpensePage
      reports={data.reports}
      categories={data.categories}
      countries={data.countries}
      currencies={data.currencies}
      suppliers={data.suppliers}
      onSave={handleBulkSave}
      loading={actionLoading}
    />
  );
};

export default BulkExpenseContainer;

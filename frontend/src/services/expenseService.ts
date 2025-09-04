/**
 * Expense Service
 * Real API calls for expense management
 */

import apiClient from './apiClient';

export interface Expense {
  id: number;
  category_id: number;
  travel_expense_report_id: number;
  purpose: string;
  document_type: string;
  boleta_supplier?: string;
  factura_supplier_id: number;
  expense_date: string;
  country_id: number;
  currency_id: number;
  amount: string;
  document_number: string;
  taxable?: string;
  document_file?: string;
  comments?: string;
  status: string;
  created_at: string;
  updated_at: string;
  category_name?: string;
  country_name?: string;
  currency_name?: string;
  currency_code?: string;
  factura_supplier_name?: string;
}

export interface ExpenseCreate {
  category_id: number;
  travel_expense_report_id: number;
  purpose: string;
  document_type: string;
  boleta_supplier?: string;
  factura_supplier_id?: number | null;
  expense_date: string;
  currency_id: number;
  amount: number;
  document_number: string;
  taxable?: string;
  document_file?: string;
  comments?: string;
}

export interface ExpenseUpdate {
  category_id?: number;
  travel_expense_report_id?: number;
  purpose?: string;
  document_type?: string;
  boleta_supplier?: string;
  factura_supplier_id?: number | null;
  expense_date?: string;
  currency_id?: number;
  amount?: number;
  document_number?: string;
  taxable?: string;
  document_file?: string;
  comments?: string;
}

export interface ExpenseListResponse {
  expenses: Expense[];
  total: number;
  skip: number;
  limit: number;
}

export interface ExpenseStatusUpdate {
  status: string;
  comments?: string;
}

export class ExpenseService {
  private readonly basePath = '/expenses';

  /**
   * Get all expenses
   */
  async getExpenses(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    status_filter?: string;
    report_id?: number;
    category_id?: number;
    country_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<ExpenseListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.status_filter) searchParams.append('status_filter', params.status_filter);
    if (params?.report_id) searchParams.append('report_id', params.report_id.toString());
    if (params?.category_id) searchParams.append('category_id', params.category_id.toString());
    if (params?.country_id) searchParams.append('country_id', params.country_id.toString());
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);
    
    // Use trailing slash to avoid 307 redirects that can drop CORS headers
    const url = `${this.basePath}/${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  }

  /**
   * Create a new expense
   */
  async createExpense(data: ExpenseCreate): Promise<Expense> {
    const response = await apiClient.post(this.basePath, data);
    return response.data;
  }

  /**
   * Get expense by ID
   */
  async getExpense(id: number): Promise<Expense> {
    const response = await apiClient.get(`${this.basePath}/${id}`);
    return response.data;
  }

  /**
   * Update expense
   */
  async updateExpense(id: number, data: ExpenseUpdate): Promise<Expense> {
    const response = await apiClient.put(`${this.basePath}/${id}`, data);
    return response.data;
  }

  /**
   * Delete expense
   */
  async deleteExpense(id: number): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}`);
  }

  /**
   * Get filter options based on user's visible data
   */
  async getFilterOptions(): Promise<{
    statuses: string[];
    categories: Array<{id: number; name: string}>;
    countries: Array<{id: number; name: string}>;
    reports: Array<{id: number; name: string}>;
  }> {
    const response = await apiClient.get(`${this.basePath}/filter-options`);
    return response.data;
  }

  /**
   * Upload file for an expense
   */
  async uploadFile(expenseId: number, formData: FormData): Promise<{
    message: string;
    filename: string;
    original_filename: string;
  }> {
    const response = await apiClient.post(`${this.basePath}/${expenseId}/upload-file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

// Export singleton instance
export const expenseService = new ExpenseService();

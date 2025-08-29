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
  currency: string;
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
  country_id: number;
  currency: string;
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
  country_id?: number;
  currency?: string;
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
  }): Promise<ExpenseListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.status_filter) searchParams.append('status_filter', params.status_filter);
    if (params?.report_id) searchParams.append('report_id', params.report_id.toString());
    
    const url = `${this.basePath}${searchParams.toString() ? `?${searchParams}` : ''}`;
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
}

// Export singleton instance
export const expenseService = new ExpenseService();

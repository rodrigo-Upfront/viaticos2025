/**
 * Credit Card Statement Service
 * Handles API calls for credit card statement import functionality
 */

import apiClient from './apiClient';

export interface CreditCardStatement {
  id: number;
  filename: string;
  original_filename: string;
  upload_date: string;
  uploaded_by_user_id: number;
  status: string;
  total_records?: number;
  processed_records?: number;
  validation_errors?: Record<string, any>;
  created_at: string;
  updated_at: string;
  uploaded_by_name?: string;
  transaction_count?: number;
  consolidated_expense_count?: number;
}

export interface CreditCardTransaction {
  id: number;
  credit_card_number: string;
  transaction_type: string;
  currency_code: string;
  amount: number;
  transaction_date: string;
  merchant?: string;
  description?: string;
  statement_id: number;
  matched_user_id?: number;
  consolidated_expense_id?: number;
  status: string;
  created_at: string;
  matched_user_name?: string;
  consolidated_expense_description?: string;
}

export interface CreditCardConsolidatedExpense {
  id: number;
  statement_id: number;
  credit_card_number: string;
  currency_code: string;
  total_amount: number;
  expense_date: string;
  expense_description: string;
  supplier_name: string;
  transaction_count: number;
  source_transaction_ids: number[];
  matched_user_id: number;
  associated_prepayment_id?: number;
  created_expense_id?: number;
  status: string;
  created_at: string;
  matched_user_name?: string;
  associated_prepayment_reason?: string;
  created_expense_purpose?: string;
}

export interface UserCurrencyCombination {
  user_id: number;
  user_name: string;
  credit_card_number: string;
  currency_code: string;
  currency_name: string;
  transaction_count: number;
  total_amount: number;
  consolidated_expenses: CreditCardConsolidatedExpense[];
}

export interface CreditCardUploadResponse {
  statement_id: number;
  filename: string;
  total_records: number;
  validation_errors?: Record<string, any>;
  user_currency_combinations: UserCurrencyCombination[];
}

export interface PrepaymentFormData {
  user_id: number;
  currency_code: string;
  reason: string;
  country_id: number;
  start_date: string;
  end_date: string;
  comment?: string;
}

export interface CreditCardProcessingResponse {
  statement_id: number;
  created_prepayments: number[];
  created_expenses: number[];
  processing_summary: Record<string, any>;
}

export interface CreditCardDashboardStats {
  total_statements: number;
  pending_processing: number;
  completed_processing: number;
  total_transactions: number;
  total_consolidated_expenses: number;
  total_created_prepayments: number;
  recent_statements: CreditCardStatement[];
}

class CreditCardService {
  /**
   * Upload a credit card statement CSV file
   */
  async uploadStatement(file: File): Promise<CreditCardUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/credit-card-statements/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  /**
   * Process uploaded statement and create prepayments
   */
  async processStatement(
    statementId: number, 
    prepaymentData: PrepaymentFormData[]
  ): Promise<CreditCardProcessingResponse> {
    const response = await apiClient.post(`/credit-card-statements/${statementId}/process`, {
      statement_id: statementId,
      prepayment_data: prepaymentData,
    });

    return response.data;
  }

  /**
   * Get list of credit card statements
   */
  async getStatements(skip = 0, limit = 50): Promise<{
    statements: CreditCardStatement[];
    total: number;
    skip: number;
    limit: number;
  }> {
    const response = await apiClient.get('/credit-card-statements/', {
      params: { skip, limit },
    });

    return response.data;
  }

  /**
   * Get credit card statement details
   */
  async getStatement(statementId: number): Promise<CreditCardStatement> {
    const response = await apiClient.get(`/credit-card-statements/${statementId}`);
    return response.data;
  }

  /**
   * Get user-currency combinations for prepayment form
   */
  async getUserCurrencyCombinations(statementId: number): Promise<UserCurrencyCombination[]> {
    const response = await apiClient.get(`/credit-card-statements/${statementId}/user-currency-combinations`);
    return response.data;
  }

  /**
   * Get transactions for a statement
   */
  async getStatementTransactions(statementId: number): Promise<CreditCardTransaction[]> {
    const response = await apiClient.get(`/credit-card-statements/${statementId}/transactions`);
    return response.data;
  }

  /**
   * Get consolidated expenses for a statement
   */
  async getStatementConsolidatedExpenses(statementId: number): Promise<CreditCardConsolidatedExpense[]> {
    const response = await apiClient.get(`/credit-card-statements/${statementId}/consolidated-expenses`);
    return response.data;
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<CreditCardDashboardStats> {
    const response = await apiClient.get('/credit-card-statements/dashboard/stats');
    return response.data;
  }

  /**
   * Delete a credit card statement
   */
  async deleteStatement(statementId: number): Promise<void> {
    await apiClient.delete(`/credit-card-statements/${statementId}`);
  }
}

export const creditCardService = new CreditCardService();
export default creditCardService;

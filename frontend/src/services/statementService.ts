import axios from 'axios';

// Create a dedicated client for statements to avoid routing issues
const statementsApiClient = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
statementsApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface StatementTransaction {
  id: number;
  transaction_date: string;
  document_number?: string;
  description: string;
  amount_local?: number;
  amount_usd?: number;
  is_personal: boolean;
  notes?: string;
}

export interface Statement {
  id: number;
  original_filename: string;
  file_path?: string;
  file_size: number;
  created_at: string;
  updated_at: string;
  processed_at?: string;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  processing_notes?: string;
  
  // Statement details
  statement_type: 'CREDIT_CARD' | 'BANK_ACCOUNT' | 'CORPORATE_CARD';
  account_number?: string;
  statement_period_start?: string;
  statement_period_end?: string;
  
  // Totals
  total_transactions: number;
  total_amount_local?: string;
  total_amount_usd?: string;
  
  // User
  uploaded_by_user_id: number;
}

export interface StatementSummary {
  total_transactions: number;
  matched_transactions: number;
  match_percentage: number;
  total_pen: number;
  total_usd: number;
}

export interface StatementUploadResponse {
  id: number;
  filename: string;
  file_size: number;
  message: string;
}

class StatementService {
  private baseUrl = '/statements';

  async uploadStatement(file: File): Promise<StatementUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const url = `${this.baseUrl}/upload`;
    console.log('Statement upload URL:', url);
    console.log('Full API call will be made to:', 'baseURL + url');
    
    const response = await statementsApiClient.post<StatementUploadResponse>(
      url,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  async getStatements(
    status?: string,
    limit?: number,
    offset?: number
  ): Promise<{ statements: Statement[]; total: number }> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    const response = await statementsApiClient.get<Statement[]>(
      `${this.baseUrl}/?${params.toString()}`
    );
    return {
      statements: response.data,
      total: response.data.length
    };
  }

  async getStatement(statementId: number): Promise<Statement> {
    const response = await statementsApiClient.get<Statement>(`${this.baseUrl}/${statementId}`);
    return response.data;
  }

  async getStatementTransactions(statementId: number): Promise<StatementTransaction[]> {
    const response = await statementsApiClient.get<StatementTransaction[]>(
      `${this.baseUrl}/${statementId}/transactions`
    );
    return response.data;
  }

  async getStatementSummary(statementId: number): Promise<StatementSummary> {
    const response = await statementsApiClient.get<StatementSummary>(
      `${this.baseUrl}/${statementId}/summary`
    );
    return response.data;
  }

  async reprocessStatement(statementId: number): Promise<{ message: string }> {
    const response = await statementsApiClient.post<{ message: string }>(
      `${this.baseUrl}/${statementId}/reprocess`
    );
    return response.data;
  }

  async deleteStatement(statementId: number): Promise<void> {
    await statementsApiClient.delete(`${this.baseUrl}/${statementId}`);
  }

  async updateTransaction(
    statementId: number,
    transactionId: number,
    transactionData: Partial<StatementTransaction>
  ): Promise<StatementTransaction> {
    const response = await statementsApiClient.put<StatementTransaction>(
      `${this.baseUrl}/${statementId}/transactions/${transactionId}`,
      transactionData
    );
    return response.data;
  }

  async deleteTransaction(statementId: number, transactionId: number): Promise<void> {
    await statementsApiClient.delete(`${this.baseUrl}/${statementId}/transactions/${transactionId}`);
  }

  async addTransaction(
    statementId: number,
    transactionData: Omit<StatementTransaction, 'id'>
  ): Promise<StatementTransaction> {
    const response = await statementsApiClient.post<StatementTransaction>(
      `${this.baseUrl}/${statementId}/transactions`,
      transactionData
    );
    return response.data;
  }
}

export const statementService = new StatementService();
export default statementService;

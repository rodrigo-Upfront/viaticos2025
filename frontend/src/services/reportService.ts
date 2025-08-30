/**
 * Travel Expense Report Service
 * Real API calls for expense report management
 */

import apiClient from './apiClient';

export interface ExpenseReport {
  id: number;
  prepayment_id: number;
  status: string;
  requesting_user_id: number;
  created_at: string;
  updated_at: string;
  prepayment_reason?: string;
  prepayment_amount?: string;
  prepayment_currency?: string;
  prepayment_destination?: string;
  requesting_user_name?: string;
  total_expenses?: string;
  expense_count?: number;
  balance?: string;
}

export interface ExpenseReportCreate {
  prepayment_id: number;
}

export interface ExpenseReportListResponse {
  reports: ExpenseReport[];
  total: number;
  skip: number;
  limit: number;
}

export interface ExpenseReportStatusUpdate {
  status: string;
  comment?: string;
}

export interface ExpenseReportSummary {
  total_reports: number;
  pending_reports: number;
  approved_reports: number;
  rejected_reports: number;
  total_amount: string;
  total_expenses: string;
  average_report_amount: string;
}

export class ReportService {
  private readonly basePath = '/expense-reports';

  /**
   * Get all expense reports
   */
  async getReports(params?: {
    skip?: number;
    limit?: number;
    status_filter?: string;
  }): Promise<ExpenseReportListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status_filter) searchParams.append('status_filter', params.status_filter);
    
    // Use trailing slash to avoid 307 redirect that strips CORS headers
    const url = `${this.basePath}/${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  }

  /**
   * Get expense reports summary
   */
  async getReportsSummary(): Promise<ExpenseReportSummary> {
    const response = await apiClient.get(`${this.basePath}/summary`);
    return response.data;
  }

  /**
   * Create a new expense report
   */
  async createReport(data: ExpenseReportCreate): Promise<ExpenseReport> {
    const response = await apiClient.post(this.basePath, data);
    return response.data;
  }

  /**
   * Get expense report by ID
   */
  async getReport(id: number): Promise<ExpenseReport> {
    const response = await apiClient.get(`${this.basePath}/${id}`);
    return response.data;
  }

  /**
   * Update expense report status
   */
  async updateReportStatus(id: number, data: ExpenseReportStatusUpdate): Promise<ExpenseReport> {
    const response = await apiClient.patch(`${this.basePath}/${id}/status`, data);
    return response.data;
  }

  /**
   * Delete expense report
   */
  async deleteReport(id: number): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}`);
  }
}

// Export singleton instance
export const reportService = new ReportService();

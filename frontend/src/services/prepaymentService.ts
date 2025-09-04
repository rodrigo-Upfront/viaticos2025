/**
 * Prepayment Service
 * Real API calls for prepayment management
 */

import apiClient from './apiClient';

export interface Prepayment {
  id: number;
  reason: string;
  destination_country_id: number;
  start_date: string;
  end_date: string;
  currency_id: number;
  currency_code?: string;
  currency_name?: string;
  amount: string;
  justification_file?: string;
  comment?: string;
  status: string;
  requesting_user_id: number;
  created_at: string;
  updated_at: string;
  destination_country_name?: string;
  requesting_user_name?: string;
}

export interface PrepaymentCreate {
  reason: string;
  destination_country_id: number;
  start_date: string;
  end_date: string;
  currency_id: number;
  amount: number;
  justification_file?: string;
  comment?: string;
}

export interface PrepaymentUpdate {
  reason?: string;
  destination_country_id?: number;
  start_date?: string;
  end_date?: string;
  currency_id?: number;
  amount?: number;
  justification_file?: string;
  comment?: string;
}

export interface PrepaymentListResponse {
  prepayments: Prepayment[];
  total: number;
  skip: number;
  limit: number;
}

export interface PrepaymentStatusUpdate {
  status: string;
  comment?: string;
}

export class PrepaymentService {
  private readonly basePath = '/prepayments';

  /**
   * Get all prepayments
   */
  async getPrepayments(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    status_filter?: string;
    country_id?: number;
  }): Promise<PrepaymentListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.status_filter) searchParams.append('status_filter', params.status_filter);
    if (params?.country_id) searchParams.append('country_id', params.country_id.toString());
    
    // Use trailing slash to avoid 307 redirects that can drop CORS headers
    const url = `${this.basePath}/${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  }

  /**
   * Create a new prepayment
   */
  async createPrepayment(data: PrepaymentCreate): Promise<Prepayment> {
    const response = await apiClient.post(this.basePath, data);
    return response.data;
  }

  /**
   * Get prepayment by ID
   */
  async getPrepayment(id: number): Promise<Prepayment> {
    const response = await apiClient.get(`${this.basePath}/${id}`);
    return response.data;
  }

  /**
   * Update prepayment
   */
  async updatePrepayment(id: number, data: PrepaymentUpdate): Promise<Prepayment> {
    const response = await apiClient.put(`${this.basePath}/${id}`, data);
    return response.data;
  }

  /**
   * Update prepayment status
   */
  async updatePrepaymentStatus(id: number, data: PrepaymentStatusUpdate): Promise<Prepayment> {
    const response = await apiClient.patch(`${this.basePath}/${id}/status`, data);
    return response.data;
  }

  /**
   * Get filter options based on user's visible data
   */
  async getFilterOptions(): Promise<{
    statuses: string[];
    countries: Array<{id: number; name: string}>;
    currencies: Array<{id: number; code: string; name: string}>;
  }> {
    const response = await apiClient.get(`${this.basePath}/filter-options`);
    return response.data;
  }

  /**
   * Delete prepayment
   */
  async deletePrepayment(id: number): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}`);
  }
}

// Export singleton instance
export const prepaymentService = new PrepaymentService();

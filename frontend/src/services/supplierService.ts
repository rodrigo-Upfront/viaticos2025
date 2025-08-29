/**
 * Supplier Service
 * Real API calls to replace mock data
 */

import apiClient from './apiClient';

export interface Supplier {
  id: number;
  name: string;
  sap_code: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierCreate {
  name: string;
  sap_code: string;
}

export interface SupplierUpdate {
  name?: string;
  sap_code?: string;
}

export interface SupplierListResponse {
  suppliers: Supplier[];
  total: number;
  skip: number;
  limit: number;
}

export class SupplierService {
  private readonly basePath = '/suppliers';

  /**
   * Get all suppliers
   */
  async getSuppliers(params?: {
    skip?: number;
    limit?: number;
    search?: string;
  }): Promise<SupplierListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    
    const url = `${this.basePath}${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  }

  /**
   * Create a new supplier
   */
  async createSupplier(data: SupplierCreate): Promise<Supplier> {
    const response = await apiClient.post(this.basePath, data);
    return response.data;
  }

  /**
   * Get supplier by ID
   */
  async getSupplier(id: number): Promise<Supplier> {
    const response = await apiClient.get(`${this.basePath}/${id}`);
    return response.data;
  }

  /**
   * Update supplier
   */
  async updateSupplier(id: number, data: SupplierUpdate): Promise<Supplier> {
    const response = await apiClient.put(`${this.basePath}/${id}`, data);
    return response.data;
  }

  /**
   * Delete supplier
   */
  async deleteSupplier(id: number): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}`);
  }
}

// Export singleton instance
export const supplierService = new SupplierService();


/**
 * Tax Service
 * Real API calls for tax management
 */

import apiClient from './apiClient';

export interface Tax {
  id: number;
  code: string;
  regime: string;
  created_at: string;
  updated_at: string;
}

export interface TaxCreate {
  code: string;
  regime: string;
}

export interface TaxUpdate {
  code?: string;
  regime?: string;
}

export interface TaxListResponse {
  taxes: Tax[];
  total: number;
  skip: number;
  limit: number;
}

class TaxService {
  private baseURL = '/taxes';

  async getTaxes(skip: number = 0, limit: number = 100, search?: string): Promise<TaxListResponse> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });
    
    if (search) {
      params.append('search', search);
    }

    const response = await apiClient.get(`${this.baseURL}?${params}`);
    return response.data;
  }

  async getTax(id: number): Promise<Tax> {
    const response = await apiClient.get(`${this.baseURL}/${id}`);
    return response.data;
  }

  async createTax(tax: TaxCreate): Promise<Tax> {
    const response = await apiClient.post(this.baseURL, tax);
    return response.data;
  }

  async updateTax(id: number, tax: TaxUpdate): Promise<Tax> {
    const response = await apiClient.put(`${this.baseURL}/${id}`, tax);
    return response.data;
  }

  async deleteTax(id: number): Promise<void> {
    await apiClient.delete(`${this.baseURL}/${id}`);
  }
}

export const taxService = new TaxService();
export default taxService;

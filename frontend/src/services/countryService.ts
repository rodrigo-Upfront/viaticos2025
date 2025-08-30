/**
 * Country Service
 * Real API calls for country management
 */

import apiClient from './apiClient';

export interface Country {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CountryCreate {
  name: string;
}

export interface CountryUpdate {
  name?: string;
}

// Note: GET /countries returns a plain array (not paginated)
export type CountryListResponse = Country[];

export class CountryService {
  private readonly basePath = '/countries';

  /**
   * Get all countries
   */
  async getCountries(): Promise<CountryListResponse> {
    const response = await apiClient.get(`${this.basePath}/`);
    return response.data as Country[];
  }

  /**
   * Create a new country
   */
  async createCountry(data: CountryCreate): Promise<Country> {
    const response = await apiClient.post(this.basePath, data);
    return response.data;
  }

  /**
   * Get country by ID
   */
  async getCountry(id: number): Promise<Country> {
    const response = await apiClient.get(`${this.basePath}/${id}`);
    return response.data;
  }

  /**
   * Update country
   */
  async updateCountry(id: number, data: CountryUpdate): Promise<Country> {
    const response = await apiClient.put(`${this.basePath}/${id}`, data);
    return response.data;
  }

  /**
   * Delete country
   */
  async deleteCountry(id: number): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}`);
  }
}

// Export singleton instance
export const countryService = new CountryService();

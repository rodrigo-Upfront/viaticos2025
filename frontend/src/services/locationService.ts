/**
 * Location Service
 * API calls for location management and location-currency associations
 */

import apiClient from './apiClient';

export interface Location {
  id: number;
  name: string;
  sap_code: string;
  cost_center: string;
  created_at: string;
  updated_at: string;
}

export interface LocationCreate {
  name: string;
  sap_code: string;
  cost_center: string;
}

export interface LocationUpdate {
  name?: string;
  sap_code?: string;
  cost_center?: string;
}

export interface LocationCurrency {
  id: number;
  location_id: number;
  currency_id: number;
  account: string;
  created_at: string;
  updated_at: string;
  currency_code?: string;
  currency_name?: string;
}

export interface LocationCurrencyCreate {
  currency_id: number;
  account: string;
}

export interface LocationCurrencyUpdate {
  account?: string;
}

export interface LocationCategory {
  id: number;
  name: string;
  account: string;
  location_id: number;
  created_at: string;
  updated_at: string;
}

export interface LocationCategoryCreate {
  name: string;
  account: string;
  location_id: number;
}

export interface LocationCategoryUpdate {
  name?: string;
  account?: string;
  location_id?: number;
}

export interface LocationWithCurrencies extends Location {
  location_currencies: LocationCurrency[];
}

export interface LocationListResponse {
  locations: Location[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export class LocationService {
  private readonly basePath = '/locations';

  /**
   * Get all locations with pagination and search
   */
  async getLocations(params?: {
    page?: number;
    per_page?: number;
    search?: string;
  }): Promise<LocationListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.search) searchParams.append('search', params.search);
    
    const url = `${this.basePath}${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  }

  /**
   * Get location by ID with currencies
   */
  async getLocation(id: number): Promise<LocationWithCurrencies> {
    const response = await apiClient.get(`${this.basePath}/${id}`);
    return response.data;
  }

  /**
   * Create a new location
   */
  async createLocation(data: LocationCreate): Promise<Location> {
    const response = await apiClient.post(this.basePath, data);
    return response.data;
  }

  /**
   * Update location
   */
  async updateLocation(id: number, data: LocationUpdate): Promise<Location> {
    const response = await apiClient.put(`${this.basePath}/${id}`, data);
    return response.data;
  }

  /**
   * Delete location
   */
  async deleteLocation(id: number): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}`);
  }

  /**
   * Get currencies for a specific location
   */
  async getLocationCurrencies(locationId: number): Promise<LocationCurrency[]> {
    const response = await apiClient.get(`${this.basePath}/${locationId}/currencies`);
    return response.data;
  }

  /**
   * Add currency to location
   */
  async addLocationCurrency(locationId: number, data: LocationCurrencyCreate): Promise<LocationCurrency> {
    const response = await apiClient.post(`${this.basePath}/${locationId}/currencies`, data);
    return response.data;
  }

  /**
   * Update location currency association
   */
  async updateLocationCurrency(
    locationId: number, 
    currencyId: number, 
    data: LocationCurrencyUpdate
  ): Promise<LocationCurrency> {
    const response = await apiClient.put(`${this.basePath}/${locationId}/currencies/${currencyId}`, data);
    return response.data;
  }

  /**
   * Remove currency from location
   */
  async removeLocationCurrency(locationId: number, currencyId: number): Promise<void> {
    await apiClient.delete(`${this.basePath}/${locationId}/currencies/${currencyId}`);
  }

  /**
   * Get categories for a specific location
   */
  async getLocationCategories(locationId: number): Promise<LocationCategory[]> {
    const response = await apiClient.get(`${this.basePath}/${locationId}/categories`);
    return response.data;
  }

  /**
   * Add category to location
   */
  async addLocationCategory(locationId: number, data: LocationCategoryCreate): Promise<LocationCategory> {
    const response = await apiClient.post(`${this.basePath}/${locationId}/categories`, data);
    return response.data;
  }

  /**
   * Update location category
   */
  async updateLocationCategory(
    locationId: number, 
    categoryId: number, 
    data: LocationCategoryUpdate
  ): Promise<LocationCategory> {
    const response = await apiClient.put(`${this.basePath}/${locationId}/categories/${categoryId}`, data);
    return response.data;
  }

  /**
   * Remove category from location
   */
  async removeLocationCategory(locationId: number, categoryId: number): Promise<void> {
    await apiClient.delete(`${this.basePath}/${locationId}/categories/${categoryId}`);
  }
}

// Export singleton instance
export const locationService = new LocationService();

/**
 * Category Service
 * Real API calls to replace mock data
 */

import apiClient from './apiClient';

export interface Category {
  id: number;
  name: string;
  account: string;
  location_id: number;
  location_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CategoryCreate {
  name: string;
  account: string;
}

export interface CategoryUpdate {
  name?: string;
  account?: string;
}

export interface CategoryListResponse {
  categories: Category[];
  total: number;
  skip: number;
  limit: number;
}

export class CategoryService {
  private readonly basePath = '/categories';

  /**
   * Get all categories
   */
  async getCategories(params?: {
    skip?: number;
    limit?: number;
    search?: string;
  }): Promise<CategoryListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    
    const url = `${this.basePath}${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  }

  /**
   * Create a new category
   */
  async createCategory(data: CategoryCreate): Promise<Category> {
    const response = await apiClient.post(this.basePath, data);
    return response.data;
  }

  /**
   * Get category by ID
   */
  async getCategory(id: number): Promise<Category> {
    const response = await apiClient.get(`${this.basePath}/${id}`);
    return response.data;
  }

  /**
   * Update category
   */
  async updateCategory(id: number, data: CategoryUpdate): Promise<Category> {
    const response = await apiClient.put(`${this.basePath}/${id}`, data);
    return response.data;
  }

  /**
   * Delete category
   */
  async deleteCategory(id: number): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}`);
  }
}

// Export singleton instance
export const categoryService = new CategoryService();


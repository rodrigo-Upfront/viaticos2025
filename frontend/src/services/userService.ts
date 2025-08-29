/**
 * User Service
 * Real API calls for user management
 */

import apiClient from './apiClient';

export interface User {
  id: number;
  email: string;
  name: string;
  surname: string;
  sap_code: string;
  country_id: number;
  cost_center: string;
  credit_card_number?: string;
  supervisor_id?: number;
  profile: string;
  is_superuser: boolean;
  is_approver: boolean;
  force_password_change: boolean;
  created_at: string;
  updated_at: string;
  country_name?: string;
  supervisor_name?: string;
}

export interface UserCreate {
  email: string;
  name: string;
  surname: string;
  password: string;
  sap_code: string;
  country_id: number;
  cost_center: string;
  credit_card_number?: string;
  supervisor_id?: number | null;
  profile: string;
  is_superuser?: boolean;
  is_approver?: boolean;
  force_password_change?: boolean;
}

export interface UserUpdate {
  email?: string;
  name?: string;
  surname?: string;
  password?: string;
  sap_code?: string;
  country_id?: number;
  cost_center?: string;
  credit_card_number?: string;
  supervisor_id?: number | null;
  profile?: string;
  is_superuser?: boolean;
  is_approver?: boolean;
  force_password_change?: boolean;
}

export interface UserListResponse {
  users: User[];
  total: number;
  skip: number;
  limit: number;
}

export class UserService {
  private readonly basePath = '/users';

  /**
   * Get all users
   */
  async getUsers(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    profile?: string;
  }): Promise<UserListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.append('skip', params.skip.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.profile) searchParams.append('profile', params.profile);
    
    const url = `${this.basePath}${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  }

  /**
   * Create a new user
   */
  async createUser(data: UserCreate): Promise<User> {
    const response = await apiClient.post(this.basePath, data);
    return response.data;
  }

  /**
   * Get user by ID
   */
  async getUser(id: number): Promise<User> {
    const response = await apiClient.get(`${this.basePath}/${id}`);
    return response.data;
  }

  /**
   * Update user
   */
  async updateUser(id: number, data: UserUpdate): Promise<User> {
    const response = await apiClient.put(`${this.basePath}/${id}`, data);
    return response.data;
  }

  /**
   * Delete user
   */
  async deleteUser(id: number): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}`);
  }
}

// Export singleton instance
export const userService = new UserService();

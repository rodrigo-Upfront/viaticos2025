import axios from 'axios';
import { MFALoginResponse, MFACompleteLoginResponse } from './mfaService';

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: number;
    email: string;
    name: string;
    surname: string;
    profile: string;
    is_superuser: boolean;
    is_approver: boolean;
    force_password_change: boolean;
  };
}

// Union type for login response - can be either complete login or MFA challenge
type LoginResult = LoginResponse | MFALoginResponse;

interface User {
  id: number;
  email: string;
  name: string;
  surname: string;
  profile: string;
  is_superuser: boolean;
  is_approver: boolean;
  force_password_change: boolean;
}

class AuthService {
  private baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

  async login(email: string, password: string): Promise<LoginResult> {
    const response = await axios.post(`${this.baseURL}/auth/login`, {
      email,
      password,
    });
    return response.data;
  }

  // Helper function to check if response requires MFA
  static requiresMFA(response: LoginResult): response is MFALoginResponse {
    return 'requires_mfa' in response && response.requires_mfa === true;
  }

  // Helper function to check if response is complete login
  static isCompleteLogin(response: LoginResult): response is LoginResponse {
    return 'access_token' in response;
  }

  async logout(): Promise<void> {
    try {
      const token = this.getAccessToken();
      await axios.post(`${this.baseURL}/auth/logout`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (error) {
      // Ignore logout errors, just clear local storage
      console.log('Logout error:', error);
    }
  }

  async getCurrentUser(): Promise<User> {
    const token = this.getAccessToken();
    const response = await axios.get(`${this.baseURL}/auth/me`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<void> {
    const token = this.getAccessToken();
    await axios.post(`${this.baseURL}/auth/change-password`, {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${this.baseURL}/auth/refresh`, {}, {
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    });

    const newAccessToken = response.data.access_token;
    localStorage.setItem('access_token', newAccessToken);
    return newAccessToken;
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

const authService = new AuthService();
export default authService;
export type { LoginResponse, LoginResult, User };

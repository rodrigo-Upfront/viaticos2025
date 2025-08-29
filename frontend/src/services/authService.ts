import axios from 'axios';

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
  private baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await axios.post(`${this.baseURL}/auth/login`, {
      email,
      password,
    });
    return response.data;
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

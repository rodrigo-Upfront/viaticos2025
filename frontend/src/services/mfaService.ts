import axios from 'axios';

interface MFALoginResponse {
  requires_mfa: boolean;
  mfa_token: string;
  message: string;
}

interface MFACompleteLoginResponse {
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

interface MFASetupResponse {
  qr_code: string; // Base64 encoded QR code
  secret: string;  // Manual entry key
  backup_codes: string[];
}

interface MFAStatusResponse {
  enabled: boolean;
  backup_codes_count?: number;
  last_used?: string;
}

interface MFABackupCodesResponse {
  backup_codes: string[];
  message: string;
}

class MFAService {
  private baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

  private getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async verifyMFA(mfaToken: string, code: string): Promise<MFACompleteLoginResponse> {
    const response = await axios.post(`${this.baseURL}/auth/mfa/verify`, {
      mfa_token: mfaToken,
      code: code.trim(),
    });
    return response.data;
  }

  async getStatus(): Promise<MFAStatusResponse> {
    const response = await axios.get(`${this.baseURL}/mfa/status`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async setupMFA(): Promise<MFASetupResponse> {
    const response = await axios.post(`${this.baseURL}/mfa/setup`, {}, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async verifySetup(token: string, secret: string, backupCodes: string[]): Promise<void> {
    await axios.post(`${this.baseURL}/mfa/verify-setup`, {
      token: token.trim(),
      secret,
      backup_codes: backupCodes,
    }, {
      headers: this.getAuthHeaders(),
    });
  }

  async disableMFA(password: string, confirmation: boolean): Promise<void> {
    await axios.post(`${this.baseURL}/mfa/disable`, {
      password,
      confirmation,
    }, {
      headers: this.getAuthHeaders(),
    });
  }

  async regenerateBackupCodes(): Promise<MFABackupCodesResponse> {
    const response = await axios.post(`${this.baseURL}/mfa/regenerate-backup-codes`, {}, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async testCode(code: string): Promise<{ valid: boolean }> {
    const response = await axios.post(`${this.baseURL}/mfa/test-code?code=${encodeURIComponent(code)}`, {}, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }
}

const mfaService = new MFAService();
export default mfaService;
export type { 
  MFALoginResponse, 
  MFACompleteLoginResponse, 
  MFASetupResponse, 
  MFAStatusResponse, 
  MFABackupCodesResponse 
};

import apiClient from './apiClient';

export interface CategoryCountryAlert {
  id: number;
  category_id: number;
  country_id: number;
  currency_id: number;
  alert_amount: number;
  alert_message?: string;
  created_at: string;
  updated_at: string;
  category_name?: string;
  country_name?: string;
  currency_code?: string;
  currency_name?: string;
}

export interface CategoryCountryAlertCreate {
  category_id: number;
  country_id: number;
  currency_id: number;
  alert_amount: number;
  alert_message?: string;
}

export interface CategoryCountryAlertUpdate {
  alert_amount?: number;
  alert_message?: string;
}

export interface AlertCheckResponse {
  has_alert: boolean;
  alert_amount: number | null;
  exceeds_alert: boolean;
  alert_message?: string | null;
}

export class CategoryAlertService {
  private baseUrl = '/category-alerts';

  async getAlerts(params?: {
    category_id?: number;
    country_id?: number;
    currency_id?: number;
  }): Promise<CategoryCountryAlert[]> {
    const response = await apiClient.get(this.baseUrl, { params });
    return response.data;
  }

  async createAlert(alertData: CategoryCountryAlertCreate): Promise<CategoryCountryAlert> {
    const response = await apiClient.post(this.baseUrl, alertData);
    return response.data;
  }

  async updateAlert(alertId: number, alertData: CategoryCountryAlertUpdate): Promise<CategoryCountryAlert> {
    const response = await apiClient.put(`${this.baseUrl}/${alertId}`, alertData);
    return response.data;
  }

  async deleteAlert(alertId: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${alertId}`);
  }

  async checkExpenseAlert(
    categoryId: number,
    countryId: number,
    currencyId: number,
    amount: number
  ): Promise<AlertCheckResponse> {
    const response = await apiClient.get(
      `${this.baseUrl}/check-alert/${categoryId}/${countryId}/${currencyId}`,
      { params: { amount } }
    );
    return response.data;
  }
}

export const categoryAlertService = new CategoryAlertService();

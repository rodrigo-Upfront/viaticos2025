import apiClient from './apiClient';

export interface Currency {
  id: number;
  name: string;
  code: string;
  symbol?: string;
}

export interface CurrencyCreate {
  name: string;
  code: string;
  symbol?: string;
}

export interface CurrencyUpdate {
  name?: string;
  code?: string;
  symbol?: string;
}

export class CurrencyService {
  private readonly basePath = '/currencies';

  async getCurrencies(): Promise<Currency[]> {
    const response = await apiClient.get(this.basePath);
    return response.data as Currency[];
  }

  async createCurrency(currencyData: CurrencyCreate): Promise<Currency> {
    const response = await apiClient.post(this.basePath, currencyData);
    return response.data as Currency;
  }

  async updateCurrency(id: number, currencyData: CurrencyUpdate): Promise<Currency> {
    const response = await apiClient.put(`${this.basePath}/${id}`, currencyData);
    return response.data as Currency;
  }

  async deleteCurrency(id: number): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}`);
  }
}

export const currencyService = new CurrencyService();



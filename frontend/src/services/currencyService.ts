import apiClient from './apiClient';

export interface Currency {
  id: number;
  name: string;
  code: string;
  symbol?: string;
}

export class CurrencyService {
  private readonly basePath = '/currencies';

  async getCurrencies(): Promise<Currency[]> {
    const response = await apiClient.get(this.basePath);
    return response.data as Currency[];
  }
}

export const currencyService = new CurrencyService();



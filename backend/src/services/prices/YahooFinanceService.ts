import type { AssetType, Currency } from '../../types';
import type { IPriceService } from './PriceService';

export class YahooFinanceService implements IPriceService {
  private readonly API_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

  async getPrice(symbol: string, _currency: Currency): Promise<number> {
    try {
      const response = await fetch(`${this.API_BASE}/${symbol}?interval=1d&range=1d`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch price from Yahoo Finance');
      }

      const data = await response.json() as any;
      return data.chart.result[0].meta.regularMarketPrice;
    } catch (error) {
      console.error('Error fetching price from Yahoo Finance:', error);
      throw error;
    }
  }

  supports(assetType: AssetType): boolean {
    return assetType === 'STOCK';
  }
} 
import type { AssetType, Currency } from '../../types';
import type { IPriceService } from './PriceService';

export class CoinGeckoService implements IPriceService {
  private readonly API_BASE = 'https://api.coingecko.com/api/v3';

  async getPrice(symbol: string, currency: Currency): Promise<number> {
    try {
      const response = await fetch(
        `${this.API_BASE}/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=${currency.toLowerCase()}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch price from CoinGecko');
      }

      const data = await response.json() as Record<string, Record<string, number>>;
      return data[symbol.toLowerCase()][currency.toLowerCase()];
    } catch (error) {
      console.error('Error fetching price from CoinGecko:', error);
      throw error;
    }
  }

  supports(assetType: AssetType): boolean {
    return assetType === 'CRYPTO';
  }
} 
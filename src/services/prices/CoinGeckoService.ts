import type { AssetType, Currency, PriceService } from '../../types';

export class CoinGeckoService implements PriceService {
  private readonly API_BASE = 'https://api.coingecko.com/api/v3';

  async getPrice(symbol: string, currency: Currency): Promise<number> {
    try {
      const response = await fetch(
        `${this.API_BASE}/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=${currency.toLowerCase()}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch price from CoinGecko');
      }

      const data = await response.json();
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

// Obtiene el precio histórico de una cripto en USD para una fecha (Date o string YYYY-MM-DD)
export async function getHistoricalPriceCoinGecko(coinId: string, date: Date | string): Promise<number | null> {
  // CoinGecko espera la fecha en formato dd-mm-yyyy
  let d: Date;
  if (typeof date === 'string') {
    d = new Date(date);
  } else {
    d = date;
  }
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const dateStr = `${day}-${month}-${year}`;
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${dateStr}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    // El precio está en data.market_data.current_price.usd
    return data?.market_data?.current_price?.usd ?? null;
  } catch (e) {
    return null;
  }
} 
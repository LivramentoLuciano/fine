import type { AssetType, Currency, PriceService } from '../../types';

export class YahooFinanceService implements PriceService {
  private readonly API_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

  async getPrice(symbol: string, _currency: Currency): Promise<number> {
    try {
      const response = await fetch(
        `${this.API_BASE}/${symbol}?interval=1d&range=1d`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch price from Yahoo Finance');
      }

      const data = await response.json();
      const price = data.chart.result[0].meta.regularMarketPrice;
      
      // Si el precio está en una moneda diferente, aquí deberíamos hacer la conversión
      // Por ahora retornamos el precio directo
      return price;
    } catch (error) {
      console.error('Error fetching price from Yahoo Finance:', error);
      throw error;
    }
  }

  supports(assetType: AssetType): boolean {
    return assetType === 'STOCK';
  }
}

// Obtiene el precio histórico de una acción en USD para una fecha (Date)
export async function getHistoricalPriceYahoo(symbol: string, date: Date): Promise<number | null> {
  // Yahoo Finance espera timestamps en segundos
  const start = Math.floor(date.getTime() / 1000);
  const end = start + 24 * 60 * 60; // Un día después
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${start}&period2=${end}&interval=1d`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    // El precio de cierre está en data.chart.result[0].indicators.quote[0].close[0]
    return data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.[0] ?? null;
  } catch (e) {
    return null;
  }
} 
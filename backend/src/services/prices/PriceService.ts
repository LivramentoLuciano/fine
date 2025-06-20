import axios from 'axios';
import type { Asset } from '../../types';
import type { AssetType, Currency } from '../../types';
import { ArgentineDollarProvider } from './ArgentineDollarProvider';

export interface PriceProvider {
  getPrice(symbol: string): Promise<number>;
}

class CoinGeckoProvider implements PriceProvider {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  async getPrice(symbol: string): Promise<number> {
    try {
      const url = `${this.baseUrl}/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd`;
      console.log(`[CoinGecko] Consultando URL: ${url}`);
      const response = await axios.get(url);
      console.log(`[CoinGecko] Status: ${response.status}`);
      console.log(`[CoinGecko] Data:`, response.data);
      if (!response.data[symbol.toLowerCase()] || typeof response.data[symbol.toLowerCase()].usd !== 'number') {
        console.error(`[CoinGecko] No se encontró el campo esperado para '${symbol}' en la respuesta:`, response.data);
        throw new Error(`No se pudo obtener el precio para ${symbol}`);
      }
      return response.data[symbol.toLowerCase()].usd;
    } catch (error) {
      console.error(`[CoinGecko] Error fetching price for ${symbol}:`, error);
      throw new Error(`Failed to fetch price for ${symbol}`);
    }
  }
}

class YahooFinanceProvider implements PriceProvider {
  private baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart';

  async getPrice(symbol: string): Promise<number> {
    try {
      const response = await axios.get(`${this.baseUrl}/${symbol}?interval=1d&range=1d`);
      return response.data.chart.result[0].meta.regularMarketPrice;
    } catch (error) {
      console.error(`Error fetching price from Yahoo Finance for ${symbol}:`, error);
      throw new Error(`Failed to fetch price for ${symbol}`);
    }
  }
}

class ExchangeRatesProvider implements PriceProvider {
  private baseUrl = 'https://api.exchangerate-api.com/v4/latest';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getPrice(symbol: string): Promise<number> {
    try {
      const response = await axios.get(`${this.baseUrl}/USD`, {
        params: {
          apikey: this.apiKey
        }
      });
      return response.data.rates[symbol];
    } catch (error) {
      console.error(`Error fetching exchange rate for ${symbol}:`, error);
      throw new Error(`Failed to fetch exchange rate for ${symbol}`);
    }
  }
}

export class PriceService {
  private providers: Map<string, PriceProvider>;

  constructor(exchangeRatesApiKey: string) {
    this.providers = new Map<string, PriceProvider>([
      ['CRYPTO', new CoinGeckoProvider()],
      ['STOCK', new YahooFinanceProvider()],
      ['FOREX', new ExchangeRatesProvider(exchangeRatesApiKey)],
      ['ARS_USD', new ArgentineDollarProvider()],
    ]);
  }

  async getCurrentPrice(asset: Asset): Promise<number> {
    // Si es un activo en ARS, usar el proveedor de dólar argentino
    if (asset.currency === 'ARS') {
      const provider = this.providers.get('ARS_USD');
      if (provider) {
        const usdRate = await provider.getPrice('USD');
        // Si el activo está en ARS, convertimos el precio a USD
        if (asset.currentPrice) {
          return asset.currentPrice / usdRate;
        }
      }
    }

    // Si no hay proveedor para el tipo de asset, lanzar error
    const provider = this.providers.get(asset.type);
    if (!provider) {
      throw new Error(`No price provider available for asset type: ${asset.type}`);
    }

    try {
      return await provider.getPrice(asset.symbol);
    } catch (error) {
      console.error(`Error getting price for ${asset.name}:`, error);
      throw error;
    }
  }

  async updateAssetPrices(assets: Asset[]): Promise<Map<string, number>> {
    const prices = new Map<string, number>();
    const updatePromises = assets.map(async (asset) => {
      try {
        const price = await this.getCurrentPrice(asset);
        prices.set(asset.id, price);
      } catch (error) {
        console.error(`Failed to update price for ${asset.name}:`, error);
      }
    });

    await Promise.all(updatePromises);
    return prices;
  }

  getPrice(_symbol: string, _currency: Currency): Promise<number> {
    // Implementation needed
    throw new Error('Method not implemented');
  }

  supports(_assetType: AssetType): boolean {
    // Implementation needed
    throw new Error('Method not implemented');
  }
}

export interface PriceService {
  getPrice(symbol: string, currency: Currency): Promise<number>;
  supports(assetType: AssetType): boolean;
} 
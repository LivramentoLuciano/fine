import type { Asset, PriceService } from '../../types';
import { CoinGeckoService } from './CoinGeckoService';
import { YahooFinanceService } from './YahooFinanceService';

export class PriceServiceFactory {
  private static services: PriceService[] = [
    new CoinGeckoService(),
    new YahooFinanceService(),
  ];

  static async updateAssetPrice(asset: Asset): Promise<number | null> {
    // Intentar obtener el precio de cada servicio hasta que uno funcione
    for (const service of this.services) {
      try {
        const price = await service.getPrice(asset.symbol, asset.currency);
        if (price !== null) {
          return price;
        }
      } catch (error) {
        console.error(`Error getting price from ${service.constructor.name} for ${asset.symbol}:`, error);
      }
    }

    // Si ningún servicio funciona, devolver el precio manual si existe
    return asset.currentPrice || null;
  }
} 
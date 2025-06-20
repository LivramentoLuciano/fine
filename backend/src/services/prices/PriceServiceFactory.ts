import type { Asset, AssetType } from '../../types/index';
import type { IPriceService } from './PriceService';

export class PriceServiceFactory {
  private static services: IPriceService[] = [];

  static registerService(service: IPriceService) {
    this.services.push(service);
  }

  static getService(assetType: AssetType): IPriceService | null {
    return this.services.find(service => service.supports(assetType)) || null;
  }

  static async updateAssetPrice(asset: Asset): Promise<number | null> {
    const service = this.getService(asset.type);
    if (!service || !asset.symbol) {
      return null;
    }

    try {
      return await service.getPrice(asset.symbol, asset.currency);
    } catch (error) {
      console.error(`Error updating price for ${asset.name}:`, error);
      return null;
    }
  }
} 
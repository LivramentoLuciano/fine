import type { Asset, AssetType } from '../../../types';
import type { PriceService } from './PriceService';

export class PriceServiceFactory {
  private static services: PriceService[] = [];

  static registerService(service: PriceService) {
    this.services.push(service);
  }

  static getService(assetType: AssetType): PriceService | null {
    return this.services.find(service => service.supports(assetType)) || null;
  }

  static async updateAssetPrice(asset: Asset): Promise<number | null> {
    if (asset.type === 'MANUAL') {
      return asset.manualPrice;
    }

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
import { PrismaClient } from '@prisma/client';
import { PriceService } from './PriceService';
import { convertPrismaAssetToAsset } from '../../types';

const prisma = new PrismaClient();

export class PriceUpdateService {
  private priceService: PriceService;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(exchangeRatesApiKey: string) {
    this.priceService = new PriceService(exchangeRatesApiKey);
  }

  async startPeriodicUpdates(intervalMinutes: number = 15) {
    // Actualizar precios inmediatamente al iniciar
    await this.updateAllPrices();

    // Configurar actualización periódica
    this.updateInterval = setInterval(
      () => this.updateAllPrices(),
      intervalMinutes * 60 * 1000
    );
  }

  stopPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private async updateAllPrices() {
    try {
      // Obtener todos los assets
      const prismaAssets = await prisma.asset.findMany();

      // Convertir a tipo Asset
      const assets = prismaAssets.map(convertPrismaAssetToAsset);

      // Obtener precios actualizados
      const prices = await this.priceService.updateAssetPrices(assets);

      // Actualizar precios en la base de datos
      const updatePromises = Array.from(prices.entries()).map(([assetId, price]) =>
        prisma.asset.update({
          where: { id: assetId },
          data: {
            currentPrice: price,
            lastPriceUpdate: new Date(),
          },
        })
      );

      await Promise.all(updatePromises);
      console.error(`Updated prices for ${prices.size} assets`);
    } catch (error) {
      console.error('Error updating prices:', error);
    }
  }
} 
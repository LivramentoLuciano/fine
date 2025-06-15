import { PrismaClient } from '@prisma/client';
import type { Asset } from '../types';
import { PriceService } from './PriceService';

const prisma = new PrismaClient();
const priceService = new PriceService();

export class AssetService {
  async getAllAssets(): Promise<Asset[]> {
    const assets = await prisma.asset.findMany({
      orderBy: { name: 'asc' },
    });

    // Actualizar precios automáticamente
    const prices = await priceService.updateAllAssetPrices(
      assets.map(asset => ({ id: asset.id, symbol: asset.symbol }))
    );

    // Actualizar los precios en la base de datos
    for (const [assetId, price] of prices.entries()) {
      await this.updateAssetPrice(assetId, price);
    }

    // Devolver los activos con los precios actualizados
    return prisma.asset.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getAssetById(id: string): Promise<Asset | null> {
    return prisma.asset.findUnique({
      where: { id },
    });
  }

  async createAsset(data: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset> {
    return prisma.asset.create({
      data: {
        name: data.name,
        symbol: data.symbol,
        type: data.type,
        totalUnits: data.totalUnits,
        averagePurchasePrice: data.averagePurchasePrice,
        currentPrice: data.currentPrice,
        lastPriceUpdate: data.lastPriceUpdate ? new Date(data.lastPriceUpdate) : null,
        currency: data.currency,
        manualPrice: data.manualPrice,
        manualPriceDate: data.manualPriceDate ? new Date(data.manualPriceDate) : null,
      },
    });
  }

  async updateAsset(id: string, data: Partial<Asset>): Promise<Asset> {
    return prisma.asset.update({
      where: { id },
      data: {
        ...data,
        lastPriceUpdate: data.lastPriceUpdate ? new Date(data.lastPriceUpdate) : undefined,
        manualPriceDate: data.manualPriceDate ? new Date(data.manualPriceDate) : undefined,
      },
    });
  }

  async deleteAsset(id: string): Promise<void> {
    await prisma.asset.delete({
      where: { id },
    });
  }

  async updateAssetPrice(id: string, currentPrice: number): Promise<Asset> {
    return prisma.asset.update({
      where: { id },
      data: {
        currentPrice,
        lastPriceUpdate: new Date(),
      },
    });
  }

  async updateManualPrice(id: string, manualPrice: number): Promise<Asset> {
    return prisma.asset.update({
      where: { id },
      data: {
        manualPrice,
        manualPriceDate: new Date(),
      },
    });
  }
} 
import { PrismaClient } from '@prisma/client';
import type { Asset } from '../types';
import { convertPrismaAssetToAsset } from '../types';
import { PriceServiceFactory } from './prices/PriceServiceFactory';

const prisma = new PrismaClient();

export class AssetService {
  async getAllAssets(): Promise<Asset[]> {
    const prismaAssets = await prisma.asset.findMany({
      orderBy: { name: 'asc' },
    });

    // Actualizar precios automáticamente
    const updatedAssets = await Promise.all(
      prismaAssets.map(async (prismaAsset) => {
        try {
          const asset = convertPrismaAssetToAsset(prismaAsset);
          const price = await PriceServiceFactory.updateAssetPrice(asset);
          if (price !== null) {
            const updatedPrismaAsset = await this.updateAssetPrice(prismaAsset.id, price);
            return convertPrismaAssetToAsset(updatedPrismaAsset);
          }
          return asset;
        } catch (error) {
          console.error(`Error updating price for asset ${prismaAsset.id}:`, error);
          return convertPrismaAssetToAsset(prismaAsset);
        }
      })
    );

    return updatedAssets;
  }

  async getAssetById(id: string): Promise<Asset | null> {
    const prismaAsset = await prisma.asset.findUnique({
      where: { id },
    });
    return prismaAsset ? convertPrismaAssetToAsset(prismaAsset) : null;
  }

  async createAsset(data: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset> {
    const prismaAsset = await prisma.asset.create({
      data: {
        name: data.name,
        symbol: data.symbol,
        type: data.type,
        totalUnits: data.totalUnits,
        averagePurchasePrice: data.averagePurchasePrice,
        currentPrice: data.currentPrice,
        lastPriceUpdate: data.lastPriceUpdate ? new Date(data.lastPriceUpdate) : null,
        currency: data.currency,
      },
    });
    return convertPrismaAssetToAsset(prismaAsset);
  }

  async updateAsset(id: string, data: Partial<Asset>): Promise<Asset> {
    const updateData: any = { ...data };
    
    // Manejar campos de fecha
    if (data.lastPriceUpdate) {
      updateData.lastPriceUpdate = new Date(data.lastPriceUpdate);
    }

    const prismaAsset = await prisma.asset.update({
      where: { id },
      data: updateData,
    });
    return convertPrismaAssetToAsset(prismaAsset);
  }

  async deleteAsset(id: string): Promise<void> {
    await prisma.asset.delete({
      where: { id },
    });
  }

  async updateAssetPrice(id: string, currentPrice: number): Promise<Asset> {
    const prismaAsset = await prisma.asset.update({
      where: { id },
      data: {
        currentPrice,
        lastPriceUpdate: new Date(),
      },
    });
    return convertPrismaAssetToAsset(prismaAsset);
  }
} 
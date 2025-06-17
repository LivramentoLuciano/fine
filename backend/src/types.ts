export type Currency = 'USD' | 'ARS';
export type AssetType = 'CRYPTO' | 'STOCK' | 'FOREX';

export interface Asset {
  id: string;
  name: string;
  symbol: string;
  type: AssetType;
  totalUnits: number;
  averagePurchasePrice: number;
  currentPrice: number | null;
  lastPriceUpdate: Date | null;
  currency: Currency;
  createdAt: Date;
  updatedAt: Date;
}

// Tipo para los resultados de Prisma
export type PrismaAsset = {
  id: string;
  name: string;
  symbol: string;
  type: string;
  totalUnits: number;
  averagePurchasePrice: number;
  currentPrice: number | null;
  lastPriceUpdate: Date | null;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
};

// Función para convertir de PrismaAsset a Asset
export function convertPrismaAssetToAsset(prismaAsset: PrismaAsset): Asset {
  return {
    ...prismaAsset,
    type: prismaAsset.type as AssetType,
    currency: prismaAsset.currency as Currency,
  };
} 
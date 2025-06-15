export type Currency = 'USD' | 'ARS';
export type AssetType = 'CRYPTO' | 'STOCK' | 'FOREX' | 'OTHER';

export interface Asset {
  id: string;
  name: string;
  symbol: string;
  type: AssetType;
  totalUnits: number;
  averagePurchasePrice: number;
  currentPrice?: number;
  lastPriceUpdate?: Date;
  currency: Currency;
  createdAt: Date;
  updatedAt: Date;
} 
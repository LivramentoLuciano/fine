export type Currency = 'USD' | 'ARS';
export type AssetType = 'CRYPTO' | 'STOCK' | 'FOREX';
export type TransactionType = 'COMPRA' | 'VENTA' | 'INGRESO' | 'RETIRO';

export interface Transaction {
  id: string;
  date: Date;
  type: TransactionType;
  amount: number;
  currency: Currency;
  assetName?: string;
  assetType?: AssetType;
  units?: number;
  notes?: string;
  plataforma?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: string;
  name: string;
  symbol: string;
  type: 'CRYPTO' | 'STOCK' | 'FOREX' | 'MANUAL' | 'OTHER';
  totalUnits: number;
  averagePurchasePrice: number;
  currentPrice?: number;
  lastPriceUpdate?: Date;
  currency: string;
  manualPrice?: number;
  manualPriceDate?: Date;
  createdAt: Date;
  updatedAt: Date;
} 
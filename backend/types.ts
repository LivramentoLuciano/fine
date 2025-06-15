export type TransactionType = 'PURCHASE' | 'SALE' | 'INCOME';
export type Currency = 'USD' | 'ARS';
export type AssetType = 'CRYPTO' | 'STOCK' | 'FOREX' | 'MANUAL' | 'OTHER';

export interface Transaction {
  id: number;
  date: Date;
  type: TransactionType;
  amount: number;
  currency: Currency;
  assetName?: string;
  units?: number;
  notes?: string;
}

export interface Asset {
  id: number;
  name: string;
  symbol: string;
  type: AssetType;
  totalUnits: number;
  averagePurchasePrice: number;
  currentPrice: number | null;
  lastPriceUpdate: Date | null;
  currency: Currency;
  manualPrice: number | null;
  manualPriceDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
} 
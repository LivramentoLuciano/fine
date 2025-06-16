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
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: string;
  name: string;
  symbol: string;
  type: AssetType;
  totalUnits: number;
  averagePurchasePrice: number;
  currentPrice: number | null;
  lastPriceUpdate: string | null;
  currency: Currency;
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceService {
  getPrice(symbol: string, currency: Currency): Promise<number>;
  supports(assetType: AssetType): boolean;
} 
export type Currency = 'USD' | 'ARS';

export type TransactionType = 'COMPRA' | 'VENTA' | 'INGRESO' | 'RETIRO';

export interface Transaction {
    id: string;
    date: string;
    type: TransactionType;
    amount: number;
    currency: Currency;
    units?: number;
    assetName?: string;
    assetType?: string;
    notes?: string;
    plataforma?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Asset {
    id: string;
    name: string;
    totalUnits: number;
    averagePurchasePrice: number;
    currentPrice?: number | null;
    lastPriceUpdate?: string | null;
    currency: Currency;
    symbol?: string;
    type?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface FinancialSummary {
    totalInvested: {
        USD: number;
        ARS: number;
    };
    totalLiquid: {
        USD: number;
        ARS: number;
    };
    assets: Asset[];
    totalValue: {
        USD: number;
        ARS: number;
    };
} 
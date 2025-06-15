export type Currency = 'USD' | 'ARS';

export type TransactionType = 'PURCHASE' | 'SALE' | 'INCOME';

export interface Transaction {
    id: string;
    date: Date;
    type: TransactionType;
    amount: number;
    currency: Currency;
    units?: number;
    assetName?: string;
    notes?: string;
    plataforma?: string;
}

export interface Asset {
    name: string;
    totalUnits: number;
    averagePurchasePrice: number;
    currentPrice?: number;
    currency: Currency;
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
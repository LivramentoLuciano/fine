import { Asset } from '../../types';

interface AssetTotals {
  totalInvestedUSD: number;
  totalInvestedARS: number;
  currentValueUSD: number;
  currentValueARS: number;
}

export const calculateTotals = (assets: Asset[]): AssetTotals => {
  return assets.reduce((acc, asset) => {
    const currentValue = asset.currentPrice 
      ? asset.totalUnits * asset.currentPrice
      : asset.totalUnits * asset.averagePurchasePrice;
    
    const investedValue = asset.totalUnits * asset.averagePurchasePrice;
    
    if (asset.currency === 'USD') {
      acc.totalInvestedUSD += investedValue;
      acc.currentValueUSD += currentValue;
    } else if (asset.currency === 'ARS') {
      acc.totalInvestedARS += investedValue;
      acc.currentValueARS += currentValue;
    }
    return acc;
  }, {
    totalInvestedUSD: 0,
    totalInvestedARS: 0,
    currentValueUSD: 0,
    currentValueARS: 0,
  });
};

export const calculateAssetPerformance = (asset: Asset) => {
  if (!asset.currentPrice) return null;
  
  const invested = asset.totalUnits * asset.averagePurchasePrice;
  const current = asset.totalUnits * asset.currentPrice;
  const performance = ((current - invested) / invested) * 100;
  
  return {
    name: asset.name,
    performance,
    currency: asset.currency,
  };
};

export const preparePieChartData = (assets: Asset[]) => {
  return assets
    .filter(asset => {
      const value = asset.currentPrice 
        ? asset.totalUnits * asset.currentPrice
        : asset.totalUnits * asset.averagePurchasePrice;
      return value > 0;
    })
    .map(asset => ({
      id: asset.id,
      value: asset.currentPrice 
        ? asset.totalUnits * asset.currentPrice
        : asset.totalUnits * asset.averagePurchasePrice,
      label: `${asset.name} (${asset.currency})`,
    }));
}; 
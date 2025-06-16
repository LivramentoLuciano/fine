import { useState, useEffect } from 'react';
import type { Asset } from '../../types/index';
import { api } from '../../services/api';
import { PriceServiceFactory } from '../../services/prices/PriceServiceFactory';

export const useAssets = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [updatingPrices, setUpdatingPrices] = useState(false);

  const updatePrices = async () => {
    setUpdatingPrices(true);
    try {
      const updatedAssets = await Promise.all(
        assets.map(async (asset) => {
          const price = await PriceServiceFactory.updateAssetPrice(asset);
          return {
            ...asset,
            currentPrice: price ?? null,
            lastPriceUpdate: price ? new Date().toISOString() : null,
          };
        })
      );
      setAssets(updatedAssets);
    } catch (err) {
      console.error('Error updating prices:', err);
    } finally {
      setUpdatingPrices(false);
    }
  };

  const loadAssets = async () => {
    try {
      setLoading(true);
      const assetsData = await api.getAssets();
      setAssets(assetsData);
      setError(null);
      await updatePrices();
    } catch (err) {
      console.error('Error loading assets:', err);
      setError('Error al cargar los activos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
    const priceUpdateInterval = setInterval(updatePrices, 5 * 60 * 1000);
    return () => clearInterval(priceUpdateInterval);
  }, []);

  return {
    assets,
    loading,
    error,
    updatingPrices,
    updatePrices,
    loadAssets
  };
}; 
import type { Asset } from '../types';
import { api } from './api';

export type PriceSource = 'COINGECKO' | 'YAHOO' | 'MANUAL';

export interface HistoricalPrice {
  id: string;
  assetId: string;
  date: Date;
  price: number;
  currency: string;
  source: PriceSource;
  createdAt: Date;
}

export class HistoricalPriceService {
  /**
   * Obtiene el precio histórico de un asset para una fecha específica
   * Usa la API del backend que maneja la persistencia
   */
  async getHistoricalPrice(
    asset: Asset,
    date: Date,
    currency: string = 'USD'
  ): Promise<number | null> {
    try {
      const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
      
      console.log(`[HistoricalPrice] Getting price for ${asset.name} on ${dateStr}`);
      
      const response = await api.getHistoricalPrice(asset.id, dateStr, currency);
      
      if (response && response.price) {
        console.log(`[HistoricalPrice] Found price: ${asset.name} on ${dateStr} = $${response.price}`);
        return response.price;
      }

      console.log(`[HistoricalPrice] No price found for ${asset.name} on ${dateStr}`);
      return null;
    } catch (error) {
      console.error(`[HistoricalPrice] Error getting price for ${asset.name} on ${date}:`, error);
      return null;
    }
  }

  /**
   * Obtiene precios históricos para un rango de fechas
   */
  async getHistoricalPrices(
    assetId: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalPrice[]> {
    try {
      const startDateStr = startDate.toISOString().slice(0, 10);
      const endDateStr = endDate.toISOString().slice(0, 10);
      
      const response = await api.getHistoricalPrices(assetId, startDateStr, endDateStr);
      
      if (response && response.prices) {
        return response.prices.map((price: any) => ({
          ...price,
          date: new Date(price.date),
          createdAt: new Date(price.createdAt)
        }));
      }

      return [];
    } catch (error) {
      console.error(`[HistoricalPrice] Error getting historical prices for asset ${assetId}:`, error);
      return [];
    }
  }

  /**
   * Actualiza el precio actual de un asset
   * Por ahora no hace nada ya que el backend maneja esto automáticamente
   */
  async updateCurrentPrice(
    asset: Asset,
    currentPrice: number | null
  ): Promise<void> {
    if (!currentPrice || currentPrice <= 0) return;

    try {
      const today = new Date().toISOString().slice(0, 10);
      
      // Crear precio histórico para hoy
      await api.createHistoricalPrice({
        assetId: asset.id,
        date: today,
        price: currentPrice,
        currency: asset.currency,
        source: 'MANUAL'
      });

      console.log(`[HistoricalPrice] Saved current price for ${asset.name}: $${currentPrice}`);
    } catch (error) {
      console.error(`[HistoricalPrice] Error saving current price for ${asset.name}:`, error);
    }
  }

  /**
   * Limpia precios históricos antiguos
   */
  async cleanupOldPrices(): Promise<void> {
    try {
      await api.cleanupOldPrices();
      console.log('[HistoricalPrice] Cleaned up old prices');
    } catch (error) {
      console.error('[HistoricalPrice] Error cleaning up old prices:', error);
    }
  }

  /**
   * Obtiene el precio más reciente para un asset
   */
  async getLatestPrice(assetId: string): Promise<HistoricalPrice | null> {
    try {
      const response = await api.getLatestPrice(assetId);
      
      if (response && response.price) {
        return {
          ...response.price,
          date: new Date(response.price.date),
          createdAt: new Date(response.price.createdAt)
        };
      }

      return null;
    } catch (error) {
      console.error(`[HistoricalPrice] Error getting latest price for asset ${assetId}:`, error);
      return null;
    }
  }

  /**
   * Elimina un precio histórico específico
   */
  async deleteHistoricalPrice(id: string): Promise<void> {
    try {
      await api.deleteHistoricalPrice(id);
      console.log(`[HistoricalPrice] Deleted historical price ${id}`);
    } catch (error) {
      console.error(`[HistoricalPrice] Error deleting historical price ${id}:`, error);
      throw error;
    }
  }

  /**
   * Crea un precio histórico manualmente
   */
  async createHistoricalPrice(data: {
    assetId: string;
    date: Date;
    price: number;
    currency: string;
    source: PriceSource;
  }): Promise<HistoricalPrice> {
    try {
      const response = await api.createHistoricalPrice({
        assetId: data.assetId,
        date: data.date.toISOString().slice(0, 10),
        price: data.price,
        currency: data.currency,
        source: data.source
      });

      if (response && response.historicalPrice) {
        return {
          ...response.historicalPrice,
          date: new Date(response.historicalPrice.date),
          createdAt: new Date(response.historicalPrice.createdAt),
          source: response.historicalPrice.source as PriceSource
        };
      }

      throw new Error('No se pudo crear el precio histórico');
    } catch (error) {
      console.error(`[HistoricalPrice] Error creating historical price for asset ${data.assetId}:`, error);
      throw error;
    }
  }

  /**
   * Precarga precios históricos de un asset desde su primera transacción hasta hoy
   */
  async preloadHistoricalPrices(
    assetId: string,
    firstTransactionDate: Date
  ): Promise<{ loaded: number; skipped: number; errors: number }> {
    try {
      const response = await api.preloadHistoricalPrices(
        assetId,
        firstTransactionDate.toISOString().slice(0, 10)
      );

      if (response && response.result) {
        console.log(`[HistoricalPrice] Preload completed: ${response.result.loaded} loaded, ${response.result.skipped} skipped, ${response.result.errors} errors`);
        return response.result;
      }

      throw new Error('No se pudo completar la precarga');
    } catch (error) {
      console.error(`[HistoricalPrice] Error preloading historical prices for asset ${assetId}:`, error);
      throw error;
    }
  }
} 
import { Request, Response } from 'express';
import { HistoricalPriceService } from '../services/HistoricalPriceService';
import { AssetService } from '../services/AssetService';

const historicalPriceService = new HistoricalPriceService();
const assetService = new AssetService();

export class HistoricalPriceController {
  /**
   * Obtiene el precio histórico de un asset para una fecha específica
   */
  async getHistoricalPrice(req: Request, res: Response) {
    try {
      const { assetId, date } = req.params;
      const { currency = 'USD' } = req.query;

      if (!assetId || !date) {
        return res.status(400).json({ 
          error: 'assetId y date son requeridos' 
        });
      }

      // Obtener el asset
      const asset = await assetService.getAssetById(assetId);
      if (!asset) {
        return res.status(404).json({ 
          error: 'Asset no encontrado' 
        });
      }

      const targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({ 
          error: 'Fecha inválida' 
        });
      }

      const price = await historicalPriceService.getHistoricalPrice(
        asset, 
        targetDate, 
        currency as string
      );

      return res.json({ 
        assetId, 
        date: targetDate.toISOString(), 
        price, 
        currency 
      });
    } catch (error) {
      console.error('Error getting historical price:', error);
      return res.status(500).json({ 
        error: 'Error interno del servidor' 
      });
    }
  }

  /**
   * Obtiene precios históricos para un rango de fechas
   */
  async getHistoricalPrices(req: Request, res: Response) {
    try {
      const { assetId } = req.params;
      const { startDate, endDate } = req.query;

      if (!assetId || !startDate || !endDate) {
        return res.status(400).json({ 
          error: 'assetId, startDate y endDate son requeridos' 
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ 
          error: 'Fechas inválidas' 
        });
      }

      const prices = await historicalPriceService.getHistoricalPrices(
        assetId, 
        start, 
        end
      );

      return res.json({ 
        assetId, 
        startDate: start.toISOString(), 
        endDate: end.toISOString(), 
        prices 
      });
    } catch (error) {
      console.error('Error getting historical prices:', error);
      return res.status(500).json({ 
        error: 'Error interno del servidor' 
      });
    }
  }

  /**
   * Obtiene el precio más reciente para un asset
   */
  async getLatestPrice(req: Request, res: Response) {
    try {
      const { assetId } = req.params;

      if (!assetId) {
        return res.status(400).json({ 
          error: 'assetId es requerido' 
        });
      }

      const price = await historicalPriceService.getLatestPrice(assetId);

      if (!price) {
        return res.status(404).json({ 
          error: 'No se encontró precio histórico para este asset' 
        });
      }

      return res.json({ price });
    } catch (error) {
      console.error('Error getting latest price:', error);
      return res.status(500).json({ 
        error: 'Error interno del servidor' 
      });
    }
  }

  /**
   * Guarda un precio histórico manualmente
   */
  async createHistoricalPrice(req: Request, res: Response) {
    try {
      const { assetId, date, price, currency = 'USD', source = 'MANUAL' } = req.body;

      if (!assetId || !date || !price) {
        return res.status(400).json({ 
          error: 'assetId, date y price son requeridos' 
        });
      }

      // Verificar que el asset existe
      const asset = await assetService.getAssetById(assetId);
      if (!asset) {
        return res.status(404).json({ 
          error: 'Asset no encontrado' 
        });
      }

      const targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({ 
          error: 'Fecha inválida' 
        });
      }

      // Crear el precio histórico
      const historicalPrice = await historicalPriceService.createHistoricalPrice({
        assetId,
        date: targetDate,
        price: parseFloat(price),
        currency,
        source
      });

      return res.status(201).json({ historicalPrice });
    } catch (error) {
      console.error('Error creating historical price:', error);
      return res.status(500).json({ 
        error: 'Error interno del servidor' 
      });
    }
  }

  /**
   * Elimina un precio histórico
   */
  async deleteHistoricalPrice(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ 
          error: 'id es requerido' 
        });
      }

      await historicalPriceService.deleteHistoricalPrice(id);

      return res.json({ 
        message: 'Precio histórico eliminado correctamente' 
      });
    } catch (error) {
      console.error('Error deleting historical price:', error);
      return res.status(500).json({ 
        error: 'Error interno del servidor' 
      });
    }
  }

  /**
   * Limpia precios históricos antiguos
   */
  async cleanupOldPrices(_req: Request, res: Response) {
    try {
      await historicalPriceService.cleanupOldPrices();

      return res.json({ 
        message: 'Limpieza de precios históricos completada' 
      });
    } catch (error) {
      console.error('Error cleaning up old prices:', error);
      return res.status(500).json({ 
        error: 'Error interno del servidor' 
      });
    }
  }

  /**
   * Precarga precios históricos de un asset desde su primera transacción hasta hoy
   */
  async preloadHistoricalPrices(req: Request, res: Response) {
    try {
      const { assetId } = req.params;
      const { firstTransactionDate } = req.body;

      if (!assetId || !firstTransactionDate) {
        return res.status(400).json({ 
          error: 'assetId y firstTransactionDate son requeridos' 
        });
      }

      // Verificar que el asset existe
      const asset = await assetService.getAssetById(assetId);
      if (!asset) {
        return res.status(404).json({ 
          error: 'Asset no encontrado' 
        });
      }

      const targetDate = new Date(firstTransactionDate);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({ 
          error: 'Fecha inválida' 
        });
      }

      // Ejecutar precarga
      const result = await historicalPriceService.preloadHistoricalPrices(
        asset,
        targetDate
      );

      return res.json({ 
        message: 'Precarga de precios históricos completada',
        assetId,
        firstTransactionDate: targetDate.toISOString(),
        result
      });
    } catch (error) {
      console.error('Error preloading historical prices:', error);
      return res.status(500).json({ 
        error: 'Error interno del servidor' 
      });
    }
  }
} 
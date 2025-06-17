import { Request, Response } from 'express';
import { PriceService } from '../services/prices/PriceService';
import { PriceUpdateService } from '../services/prices/PriceUpdateService';
import { AssetService } from '../services/AssetService';
import { z } from 'zod';

const priceUpdateSchema = z.object({
  intervalMinutes: z.number().min(1).max(1440).optional(),
});

export class PriceController {
  private priceService: PriceService;
  private priceUpdateService: PriceUpdateService;
  private assetService: AssetService;

  constructor(exchangeRatesApiKey: string) {
    this.priceService = new PriceService(exchangeRatesApiKey);
    this.priceUpdateService = new PriceUpdateService(exchangeRatesApiKey);
    this.assetService = new AssetService();
  }

  async getCurrentPrice(req: Request, res: Response) {
    try {
      const { assetId } = req.params;
      
      // Obtener el asset primero
      const asset = await this.assetService.getAssetById(assetId);
      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      const price = await this.priceService.getCurrentPrice(asset);
      return res.json({ price });
    } catch (error) {
      console.error('Error getting current price:', error);
      return res.status(500).json({ error: 'Error getting current price' });
    }
  }

  async startPeriodicUpdates(req: Request, res: Response) {
    try {
      const { intervalMinutes } = priceUpdateSchema.parse(req.body);
      await this.priceUpdateService.startPeriodicUpdates(intervalMinutes);
      res.json({ message: 'Periodic price updates started' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error('Error starting periodic updates:', error);
        res.status(500).json({ error: 'Error starting periodic updates' });
      }
    }
  }

  async stopPeriodicUpdates(_req: Request, res: Response) {
    try {
      this.priceUpdateService.stopPeriodicUpdates();
      res.json({ message: 'Periodic price updates stopped' });
    } catch (error) {
      console.error('Error stopping periodic updates:', error);
      res.status(500).json({ error: 'Error stopping periodic updates' });
    }
  }
} 
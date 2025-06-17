import { Request, Response } from 'express';
import { AssetService } from '../services/AssetService';
import type { Asset } from '../types/index';

const assetService = new AssetService();

export class AssetController {
  async getAllAssets(_req: Request, res: Response) {
    try {
      const assets = await assetService.getAllAssets();
      res.json(assets);
    } catch (error) {
      console.error('Error fetching assets:', error);
      res.status(500).json({ error: 'Error fetching assets' });
    }
  }

  async getAssetById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const asset = await assetService.getAssetById(id);

      if (!asset) {
        return res.status(404).json({ error: 'Asset not found' });
      }

      return res.json(asset);
    } catch (error) {
      console.error('Error fetching asset:', error);
      return res.status(500).json({ error: 'Error fetching asset' });
    }
  }

  async createAsset(req: Request, res: Response) {
    try {
      const data = req.body as Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>;
      const asset = await assetService.createAsset(data);
      res.status(201).json(asset);
    } catch (error) {
      console.error('Error creating asset:', error);
      res.status(500).json({ error: 'Error creating asset' });
    }
  }

  async updateAsset(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body as Partial<Asset>;
      const asset = await assetService.updateAsset(id, data);
      res.json(asset);
    } catch (error) {
      console.error('Error updating asset:', error);
      res.status(500).json({ error: 'Error updating asset' });
    }
  }

  async deleteAsset(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await assetService.deleteAsset(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting asset:', error);
      res.status(500).json({ error: 'Error deleting asset' });
    }
  }

  async updateAssetPrice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { currentPrice } = req.body;
      
      if (typeof currentPrice !== 'number' || currentPrice < 0) {
        return res.status(400).json({ error: 'Invalid price value' });
      }
      
      const asset = await assetService.updateAssetPrice(id, currentPrice);
      return res.json(asset);
    } catch (error) {
      console.error('Error updating asset price:', error);
      return res.status(500).json({ error: 'Error updating asset price' });
    }
  }
} 
import { Router } from 'express';
import { AssetController } from '../controllers/AssetController';
import { validateAsset } from '../middleware/validation';

export const createAssetRoutes = () => {
  const router = Router();
  const assetController = new AssetController();

  // GET /api/assets
  router.get('/', assetController.getAllAssets);

  // GET /api/assets/:id
  router.get('/:id', assetController.getAssetById);

  // POST /api/assets
  router.post('/', validateAsset, assetController.createAsset);

  // PUT /api/assets/:id
  router.put('/:id', validateAsset, assetController.updateAsset);

  // DELETE /api/assets/:id
  router.delete('/:id', assetController.deleteAsset);

  // PUT /api/assets/:id/price
  router.put('/:id/price', validateAsset, assetController.updateAssetPrice);

  // PUT /api/assets/:id/manual-price
  router.put('/:id/manual-price', validateAsset, assetController.updateManualPrice);

  return router;
}; 
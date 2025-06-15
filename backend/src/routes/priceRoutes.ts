import { Router } from 'express';
import { PriceController } from '../controllers/PriceController';

export function createPriceRoutes(exchangeRatesApiKey: string) {
  const router = Router();
  const priceController = new PriceController(exchangeRatesApiKey);

  // Obtener precio actual de un asset
  router.get('/:assetId', (req, res) => priceController.getCurrentPrice(req, res));

  // Iniciar actualizaciones periódicas
  router.post('/updates/start', (req, res) => priceController.startPeriodicUpdates(req, res));

  // Detener actualizaciones periódicas
  router.post('/updates/stop', (req, res) => priceController.stopPeriodicUpdates(req, res));

  return router;
} 
import { Router } from 'express';
import { HistoricalPriceController } from '../controllers/HistoricalPriceController';

const router = Router();
const historicalPriceController = new HistoricalPriceController();

// Obtener precio histórico para una fecha específica
router.get('/:assetId/:date', historicalPriceController.getHistoricalPrice.bind(historicalPriceController));

// Obtener precios históricos para un rango de fechas
router.get('/:assetId/range', historicalPriceController.getHistoricalPrices.bind(historicalPriceController));

// Obtener el precio más reciente
router.get('/:assetId/latest', historicalPriceController.getLatestPrice.bind(historicalPriceController));

// Crear precio histórico manualmente
router.post('/', historicalPriceController.createHistoricalPrice.bind(historicalPriceController));

// Eliminar precio histórico
router.delete('/:id', historicalPriceController.deleteHistoricalPrice.bind(historicalPriceController));

// Limpiar precios antiguos
router.delete('/cleanup/old', historicalPriceController.cleanupOldPrices.bind(historicalPriceController));

export default router; 
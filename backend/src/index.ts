import express from 'express';
import cors from 'cors';
import { createTransactionRoutes } from './routes/transactionRoutes';
import { createAssetRoutes } from './routes/assetRoutes';
import { createPriceRoutes } from './routes/priceRoutes';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

const app = express();
const port = process.env.PORT || 3000;

// Configuración de variables de entorno
const EXCHANGE_RATES_API_KEY = process.env.EXCHANGE_RATES_API_KEY || '';

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173', // Desarrollo local
    'https://fine-production.up.railway.app', // Producción Railway
    'https://fine-production.up.railway.app:443' // Puerto HTTPS
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(requestLogger);

// Ruta de prueba
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Rutas
app.use('/api/transactions', createTransactionRoutes());
app.use('/api/assets', createAssetRoutes());
app.use('/api/prices', createPriceRoutes(EXCHANGE_RATES_API_KEY));

// Manejador de errores
app.use(errorHandler);

// Iniciar servidor
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Health check available at http://localhost:${port}/api/health`);
}); 
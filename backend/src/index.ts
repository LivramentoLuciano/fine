import express from 'express';
import cors from 'cors';
import { createTransactionRoutes } from './routes/transactionRoutes';
import { createAssetRoutes } from './routes/assetRoutes';
import { createPriceRoutes } from './routes/priceRoutes';
import historicalPriceRoutes from './routes/historicalPriceRoutes';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { PriceServiceFactory } from './services/prices/PriceServiceFactory';
import { CoinGeckoService } from './services/prices/CoinGeckoService';
import { YahooFinanceService } from './services/prices/YahooFinanceService';

const app = express();
const port = process.env.PORT || 3000;

// Configuración de variables de entorno
const EXCHANGE_RATES_API_KEY = process.env.EXCHANGE_RATES_API_KEY || '';

// Inicializar servicios de precios
PriceServiceFactory.registerService(new CoinGeckoService());
PriceServiceFactory.registerService(new YahooFinanceService());

// Middleware
app.use(cors({
  origin: true, // Permitir todas las origenes durante pruebas
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

// Endpoint de prueba para transacciones
app.get('/api/test-transactions', async (_req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Probar conexión a la base de datos
    await prisma.$connect();
    
    // Contar transacciones
    const count = await prisma.transaction.count();
    
    // Intentar obtener transacciones
    const transactions = await prisma.transaction.findMany({
      take: 5,
      orderBy: { date: 'desc' }
    });
    
    await prisma.$disconnect();
    
    res.json({ 
      status: 'ok', 
      message: 'Database connection successful',
      count,
      sampleTransactions: transactions
    });
  } catch (error) {
    console.error('Test transactions error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

// Rutas
app.use('/api/transactions', createTransactionRoutes());
app.use('/api/assets', createAssetRoutes());
app.use('/api/prices', createPriceRoutes(EXCHANGE_RATES_API_KEY));
app.use('/api/historical-prices', historicalPriceRoutes);

// Manejador de errores
app.use(errorHandler);

// Iniciar servidor
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Health check available at http://localhost:${port}/api/health`);
}); 
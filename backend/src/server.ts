import express from 'express';
import cors from 'cors';
import { createTransactionRoutes } from './routes/transactionRoutes';
import { createAssetRoutes } from './routes/assetRoutes';

// Middleware de logging
const requestLogger = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
};

const errorLogger = (err: Error, _req: express.Request, _res: express.Response, next: express.NextFunction) => {
  console.error(`[${new Date().toISOString()}] Error:`, err);
  next(err);
};

const app = express();
const port = 3001;

// Middleware de logging
app.use(requestLogger);

// Configuración de CORS
app.use(cors({
  origin: [
    'http://localhost:5173', // Desarrollo local
    'https://fine-production.up.railway.app', // Producción Railway
    'https://fine-production.up.railway.app:443' // Puerto HTTPS
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

app.use(express.json());

// Rutas
app.use('/api/transactions', createTransactionRoutes());
app.use('/api/assets', createAssetRoutes());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Middleware de manejo de errores
app.use(errorLogger);
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.error(`Server running at http://localhost:${port}`);
  console.error('Press Ctrl + C to stop the server');
}); 
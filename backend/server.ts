import express from 'express';
import cors from 'cors';
import transactionRoutes from './src/routes/transactionRoutes';
import assetRoutes from './src/routes/assetRoutes';
import { requestLogger, errorLogger } from './src/middleware/logging';

const app = express();
const port = 3001;

// Middleware de logging
app.use(requestLogger);

// Configuración de CORS
app.use(cors({
  origin: 'http://localhost:5173', // URL del frontend de Vite
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// Rutas
app.use('/api/transactions', transactionRoutes);
app.use('/api/assets', assetRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Middleware de manejo de errores
app.use(errorLogger);
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Press Ctrl + C to stop the server');
}); 
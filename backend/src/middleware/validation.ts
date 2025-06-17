import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Esquemas de validación
const transactionSchema = z.object({
  date: z.string().transform(str => new Date(str)),
  type: z.enum(['COMPRA', 'VENTA', 'INGRESO', 'RETIRO'] as const),
  amount: z.number().positive(),
  currency: z.enum(['USD', 'ARS'] as const),
  units: z.number().positive().optional(),
  assetName: z.string().optional(),
  assetType: z.enum(['CRYPTO', 'STOCK', 'FOREX'] as const).optional(),
  notes: z.string().optional(),
  plataforma: z.string().optional(),
});

const assetSchema = z.object({
  name: z.string().min(1),
  symbol: z.string().min(1),
  type: z.enum(['CRYPTO', 'STOCK', 'FOREX'] as const),
  totalUnits: z.number().min(0),
  averagePurchasePrice: z.number().min(0),
  currentPrice: z.number().positive().optional(),
  currency: z.enum(['USD', 'ARS'] as const),
  manualPrice: z.number().positive().optional(),
});

// Middleware de validación para transacciones
export const validateTransaction = (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = transactionSchema.parse(req.body);
    req.body = validatedData;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    } else {
      next(error);
    }
  }
};

// Middleware de validación para assets
export const validateAsset = (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = assetSchema.parse(req.body);
    req.body = validatedData;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    } else {
      next(error);
    }
  }
}; 
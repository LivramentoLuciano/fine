import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  
  res.on('finish', () => {
    console.error(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode}`
    );
  });
  
  next();
}; 
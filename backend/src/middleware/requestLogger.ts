import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
    );
    if (res.statusCode >= 400) {
      console.error('Request failed:', {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        body: req.body,
        query: req.query,
        params: req.params
      });
    }
  });

  next();
} 
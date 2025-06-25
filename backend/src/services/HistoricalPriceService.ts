import { PrismaClient } from '@prisma/client';
import type { Asset } from '../types';

export type PriceSource = 'COINGECKO' | 'YAHOO' | 'MANUAL';

export interface HistoricalPrice {
  id: string;
  assetId: string;
  date: Date;
  price: number;
  currency: string;
  source: PriceSource;
  createdAt: Date;
}

const prisma = new PrismaClient();

// Funciones para obtener precios de APIs externas
async function getHistoricalPriceCoinGecko(symbol: string, date: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${symbol}/history?date=${date}`
    );
    
    if (!response.ok) {
      console.warn(`[CoinGecko] No historical price for ${symbol} on ${date}`);
      return null;
    }

    const data = await response.json() as { market_data?: { current_price?: { usd?: number } } };
    return data.market_data?.current_price?.usd || null;
  } catch (error) {
    console.error(`[CoinGecko] Error getting historical price for ${symbol}:`, error);
    return null;
  }
}

async function getHistoricalPriceYahoo(symbol: string, date: Date): Promise<number | null> {
  try {
    const startDate = Math.floor(date.getTime() / 1000);
    const endDate = startDate + 86400; // +1 day
    
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startDate}&period2=${endDate}&interval=1d`
    );
    
    if (!response.ok) {
      console.warn(`[Yahoo] No historical price for ${symbol} on ${date.toISOString().slice(0, 10)}`);
      return null;
    }

    const data = await response.json() as { 
      chart?: { 
        result?: Array<{ 
          indicators?: { 
            quote?: Array<{ 
              close?: number[] 
            }> 
          } 
        }> 
      } 
    };
    const prices = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    return prices?.[0] || null;
  } catch (error) {
    console.error(`[Yahoo] Error getting historical price for ${symbol}:`, error);
    return null;
  }
}

export class HistoricalPriceService {
  /**
   * Obtiene el precio histórico de un asset para una fecha específica
   * Primero busca en la BD, si no existe lo obtiene de APIs externas y lo guarda
   */
  async getHistoricalPrice(
    asset: Asset,
    date: Date,
    currency: string = 'USD'
  ): Promise<number | null> {
    try {
      const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
      const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
      const endOfDay = new Date(dateStr + 'T23:59:59.999Z');
      
      console.log(`[HistoricalPrice] Getting price for ${asset.name} on ${dateStr}`);
      
      // Primero buscar en la base de datos
      const existingPrice = await prisma.historicalPrice.findFirst({
        where: {
          assetId: asset.id,
          date: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });

      if (existingPrice) {
        console.log(`[HistoricalPrice] Found in DB: ${asset.name} on ${dateStr} = $${existingPrice.price}`);
        return existingPrice.price;
      }

      // Si no existe en BD, obtener de API externa
      let price: number | null = null;
      let source: PriceSource = 'MANUAL';

      if (asset.type === 'CRYPTO') {
        // Validación: no permitir fechas de más de 365 días atrás
        const today = new Date();
        const diffTime = today.getTime() - date.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        if (diffDays > 365) {
          console.warn(`[HistoricalPrice] Fecha fuera de rango para CoinGecko: ${dateStr} (más de 365 días atrás)`);
          return null;
        }
        // Formatear fecha a DD-MM-YYYY para CoinGecko
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const dateStrCoinGecko = `${day}-${month}-${year}`;
        price = await getHistoricalPriceCoinGecko(asset.symbol, dateStrCoinGecko);
        source = 'COINGECKO';
      } else if (asset.type === 'STOCK' || asset.type === 'FOREX') {
        price = await getHistoricalPriceYahoo(asset.symbol, date);
        source = 'YAHOO';
      }

      if (price && price > 0) {
        // Guardar en la base de datos
        await prisma.historicalPrice.create({
          data: {
            assetId: asset.id,
            date: startOfDay,
            price,
            currency,
            source
          }
        });

        console.log(`[HistoricalPrice] Saved to DB: ${asset.name} on ${dateStr} = $${price}`);
        return price;
      }

      console.log(`[HistoricalPrice] No price found for ${asset.name} on ${dateStr}`);
      return null;
    } catch (error) {
      console.error(`[HistoricalPrice] Error getting price for ${asset.name} on ${date}:`, error);
      return null;
    }
  }

  /**
   * Obtiene precios históricos para un rango de fechas
   */
  async getHistoricalPrices(
    assetId: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalPrice[]> {
    try {
      const prices = await prisma.historicalPrice.findMany({
        where: {
          assetId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: {
          date: 'asc'
        }
      });

      return prices.map(price => ({
        ...price,
        date: new Date(price.date),
        createdAt: new Date(price.createdAt),
        source: price.source as PriceSource
      }));
    } catch (error) {
      console.error(`[HistoricalPrice] Error getting historical prices for asset ${assetId}:`, error);
      return [];
    }
  }

  /**
   * Actualiza el precio actual de un asset y lo guarda como histórico
   */
  async updateCurrentPrice(
    asset: Asset,
    currentPrice: number | null
  ): Promise<void> {
    if (!currentPrice || currentPrice <= 0) return;

    try {
      const today = new Date();
      const startOfDay = new Date(today.toISOString().slice(0, 10) + 'T00:00:00.000Z');

      // Verificar si ya existe un precio para hoy
      const existingPrice = await prisma.historicalPrice.findFirst({
        where: {
          assetId: asset.id,
          date: {
            gte: startOfDay,
            lte: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1)
          }
        }
      });

      if (!existingPrice) {
        // Guardar el precio actual como histórico
        await prisma.historicalPrice.create({
          data: {
            assetId: asset.id,
            date: startOfDay,
            price: currentPrice,
            currency: asset.currency,
            source: 'MANUAL'
          }
        });

        console.log(`[HistoricalPrice] Saved current price for ${asset.name}: $${currentPrice}`);
      }
    } catch (error) {
      console.error(`[HistoricalPrice] Error saving current price for ${asset.name}:`, error);
    }
  }

  /**
   * Limpia precios históricos antiguos (más de 1 año)
   */
  async cleanupOldPrices(): Promise<void> {
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const deletedCount = await prisma.historicalPrice.deleteMany({
        where: {
          date: {
            lt: oneYearAgo
          }
        }
      });

      console.log(`[HistoricalPrice] Cleaned up ${deletedCount.count} old prices`);
    } catch (error) {
      console.error('[HistoricalPrice] Error cleaning up old prices:', error);
    }
  }

  /**
   * Obtiene el precio más reciente para un asset
   */
  async getLatestPrice(assetId: string): Promise<HistoricalPrice | null> {
    try {
      const price = await prisma.historicalPrice.findFirst({
        where: { assetId },
        orderBy: { date: 'desc' }
      });

      return price ? {
        ...price,
        date: new Date(price.date),
        createdAt: new Date(price.createdAt),
        source: price.source as PriceSource
      } : null;
    } catch (error) {
      console.error(`[HistoricalPrice] Error getting latest price for asset ${assetId}:`, error);
      return null;
    }
  }

  /**
   * Elimina un precio histórico específico
   */
  async deleteHistoricalPrice(id: string): Promise<void> {
    try {
      await prisma.historicalPrice.delete({
        where: { id }
      });
      console.log(`[HistoricalPrice] Deleted historical price ${id}`);
    } catch (error) {
      console.error(`[HistoricalPrice] Error deleting historical price ${id}:`, error);
      throw error;
    }
  }

  /**
   * Crea un precio histórico manualmente
   */
  async createHistoricalPrice(data: {
    assetId: string;
    date: Date;
    price: number;
    currency: string;
    source: PriceSource;
  }): Promise<HistoricalPrice> {
    try {
      const startOfDay = new Date(data.date.toISOString().slice(0, 10) + 'T00:00:00.000Z');

      const historicalPrice = await prisma.historicalPrice.create({
        data: {
          assetId: data.assetId,
          date: startOfDay,
          price: data.price,
          currency: data.currency,
          source: data.source
        }
      });

      console.log(`[HistoricalPrice] Created historical price for asset ${data.assetId} on ${startOfDay.toISOString().slice(0, 10)} = $${data.price}`);

      return {
        ...historicalPrice,
        date: new Date(historicalPrice.date),
        createdAt: new Date(historicalPrice.createdAt),
        source: historicalPrice.source as PriceSource
      };
    } catch (error) {
      console.error(`[HistoricalPrice] Error creating historical price for asset ${data.assetId}:`, error);
      throw error;
    }
  }

  /**
   * Precarga todos los precios históricos de un asset desde su primera transacción hasta hoy
   */
  async preloadHistoricalPrices(
    asset: Asset,
    firstTransactionDate: Date,
    currency: string = 'USD'
  ): Promise<{ loaded: number; skipped: number; errors: number }> {
    try {
      console.log(`[HistoricalPrice] Starting preload for ${asset.name} from ${firstTransactionDate.toISOString().slice(0, 10)} to today`);
      
      const today = new Date();
      const startDate = new Date(firstTransactionDate);
      startDate.setHours(0, 0, 0, 0);
      
      let loaded = 0;
      let skipped = 0;
      let errors = 0;

      // Generar array de fechas desde la primera transacción hasta hoy
      const dates: Date[] = [];
      let currentDate = new Date(startDate);
      
      while (currentDate <= today) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log(`[HistoricalPrice] Will check ${dates.length} dates for ${asset.name}`);
      console.log(`[HistoricalPrice] Date range: ${startDate.toISOString().slice(0, 10)} to ${today.toISOString().slice(0, 10)}`);

      // Procesar cada fecha
      for (const date of dates) {
        try {
          const dateStr = date.toISOString().slice(0, 10);
          const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
          const endOfDay = new Date(dateStr + 'T23:59:59.999Z');

          console.log(`[HistoricalPrice] Processing date: ${dateStr} for ${asset.name}`);

          // Verificar si ya existe un precio para esta fecha
          const existingPrice = await prisma.historicalPrice.findFirst({
            where: {
              assetId: asset.id,
              date: {
                gte: startOfDay,
                lte: endOfDay
              }
            }
          });

          if (existingPrice) {
            console.log(`[HistoricalPrice] Price already exists for ${asset.name} on ${dateStr}: $${existingPrice.price}`);
            skipped++;
            continue; // Ya existe, saltar
          }

          console.log(`[HistoricalPrice] No existing price found for ${asset.name} on ${dateStr}, fetching from API...`);

          // Obtener precio de API externa
          let price: number | null = null;
          let source: PriceSource = 'MANUAL';

          if (asset.type === 'CRYPTO') {
            console.log(`[HistoricalPrice] Fetching from CoinGecko for ${asset.symbol} on ${dateStr}`);
            price = await getHistoricalPriceCoinGecko(asset.symbol, dateStr);
            source = 'COINGECKO';
          } else if (asset.type === 'STOCK' || asset.type === 'FOREX') {
            console.log(`[HistoricalPrice] Fetching from Yahoo for ${asset.symbol} on ${dateStr}`);
            price = await getHistoricalPriceYahoo(asset.symbol, date);
            source = 'YAHOO';
          }

          console.log(`[HistoricalPrice] API returned price for ${asset.name} on ${dateStr}: ${price}`);

          if (price && price > 0) {
            // Guardar en la base de datos
            await prisma.historicalPrice.create({
              data: {
                assetId: asset.id,
                date: startOfDay,
                price,
                currency,
                source
              }
            });

            loaded++;
            console.log(`[HistoricalPrice] Saved to DB: ${asset.name} on ${dateStr} = $${price}`);
          } else {
            console.log(`[HistoricalPrice] No valid price available for ${asset.name} on ${dateStr} (price: ${price})`);
          }

          // Pequeña pausa para no sobrecargar las APIs
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`[HistoricalPrice] Error loading price for ${asset.name} on ${date.toISOString().slice(0, 10)}:`, error);
          errors++;
        }
      }

      console.log(`[HistoricalPrice] Preload completed for ${asset.name}: ${loaded} loaded, ${skipped} skipped, ${errors} errors`);
      return { loaded, skipped, errors };

    } catch (error) {
      console.error(`[HistoricalPrice] Error in preload for ${asset.name}:`, error);
      throw error;
    }
  }
} 
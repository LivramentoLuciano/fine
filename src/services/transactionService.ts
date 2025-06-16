import { PrismaClient } from '@prisma/client';
import type { Transaction } from '../types';

const prisma = new PrismaClient();

export const transactionService = {
  async createTransaction(data: Omit<Transaction, 'id'>) {
    try {
      const transaction = await prisma.transaction.create({
        data: {
          date: data.date,
          type: data.type,
          amount: data.amount,
          currency: data.currency,
          units: data.units || null,
          assetName: data.assetName || null,
          notes: data.notes || null,
        },
      });

      // Si es una compra o venta, actualizar el asset
      if ((data.type === 'COMPRA' || data.type === 'VENTA') && data.assetName && data.units && data.assetType) {
        const asset = await prisma.asset.findUnique({
          where: { name: data.assetName },
        });

        if (data.type === 'COMPRA') {
          if (asset) {
            // Actualizar asset existente
            const newTotalUnits = asset.totalUnits + data.units;
            const newAveragePrice = (
              (asset.totalUnits * asset.averagePurchasePrice + data.amount) /
              newTotalUnits
            );

            await prisma.asset.update({
              where: { name: data.assetName },
              data: {
                totalUnits: newTotalUnits,
                averagePurchasePrice: newAveragePrice,
                updatedAt: new Date(),
              },
            });
          } else {
            // Crear nuevo asset
            await prisma.asset.create({
              data: {
                name: data.assetName,
                symbol: data.assetName, // Usando el nombre como símbolo por defecto
                type: data.assetType,
                totalUnits: data.units,
                averagePurchasePrice: data.amount / data.units,
                currency: data.currency,
              },
            });
          }
        } else if (data.type === 'VENTA' && asset) {
          // Actualizar units para venta
          const newTotalUnits = asset.totalUnits - data.units;
          await prisma.asset.update({
            where: { name: data.assetName },
            data: {
              totalUnits: newTotalUnits,
              updatedAt: new Date(),
            },
          });
        }
      }

      return transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  },

  async getTransactions() {
    try {
      return await prisma.transaction.findMany({
        orderBy: { date: 'desc' },
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  },

  async getAssets() {
    try {
      return await prisma.asset.findMany({
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      console.error('Error fetching assets:', error);
      throw error;
    }
  },
}; 
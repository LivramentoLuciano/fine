import { PrismaClient, Transaction as PrismaTransaction } from '@prisma/client';
import type { Transaction } from '../types/index';

const prisma = new PrismaClient();

export class TransactionService {
  async createTransaction(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const transaction = await prisma.transaction.create({
      data: {
        date: new Date(data.date),
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        units: data.units || null,
        assetName: data.assetName || null,
        assetType: data.assetType || null,
        notes: data.notes || null,
        plataforma: data.plataforma || null,
      } as PrismaTransaction,
    });

    // Si es una compra o venta, actualizar el asset
    if ((data.type === 'COMPRA' || data.type === 'VENTA') && data.assetName && data.units) {
      await this.updateAssetAfterTransaction(data);
    }

    return transaction;
  }

  private async updateAssetAfterTransaction(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) {
    const asset = await prisma.asset.findUnique({
      where: { name: data.assetName },
    });

    if (data.type === 'COMPRA') {
      if (asset) {
        // Actualizar asset existente
        const newTotalUnits = asset.totalUnits + data.units!;
        const newAveragePrice = (
          (asset.totalUnits * asset.averagePurchasePrice + data.amount) /
          newTotalUnits
        );

        await prisma.asset.update({
          where: { name: data.assetName },
          data: {
            totalUnits: newTotalUnits,
            averagePurchasePrice: newAveragePrice,
            lastPriceUpdate: new Date(),
          },
        });
      } else {
        // Crear nuevo asset
        await prisma.asset.create({
          data: {
            name: data.assetName!,
            symbol: data.assetName!, // Por ahora usamos el nombre como símbolo
            type: data.assetType || 'CRYPTO', // Usar el tipo proporcionado o CRYPTO por defecto
            totalUnits: data.units!,
            averagePurchasePrice: data.amount / data.units!,
            currency: data.currency,
          },
        });
      }
    } else if (data.type === 'VENTA' && asset) {
      // Actualizar units para venta
      const newTotalUnits = asset.totalUnits - data.units!;
      if (newTotalUnits < 0) {
        throw new Error('No hay suficientes unidades para realizar la venta');
      }
      await prisma.asset.update({
        where: { name: data.assetName },
        data: {
          totalUnits: newTotalUnits,
          lastPriceUpdate: new Date(),
        },
      });
    }
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return prisma.transaction.findMany({
      orderBy: { date: 'desc' },
    });
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    return prisma.transaction.findUnique({
      where: { id },
    });
  }

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction> {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new Error('Transacción no encontrada');
    }

    return prisma.transaction.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
        plataforma: data.plataforma ?? undefined,
      } as Partial<PrismaTransaction>,
    });
  }

  async deleteTransaction(id: string): Promise<void> {
    // Usar una transacción de base de datos para asegurar atomicidad
    await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id },
      });

      if (!transaction) {
        throw new Error('Transacción no encontrada');
      }

      // Si es una compra o venta, revertir los cambios en el asset
      if ((transaction.type === 'COMPRA' || transaction.type === 'VENTA') && 
          transaction.assetName && transaction.units) {
        const asset = await tx.asset.findUnique({
          where: { name: transaction.assetName },
        });

        if (asset) {
          if (transaction.type === 'COMPRA') {
            const newTotalUnits = asset.totalUnits - transaction.units;
            if (newTotalUnits < 0) {
              throw new Error('No se puede eliminar la transacción: no hay suficientes unidades para revertir la compra');
            }
            if (newTotalUnits === 0) {
              // Eliminar el asset si llega a cero
              await tx.asset.delete({ where: { name: transaction.assetName } });
            } else {
              await tx.asset.update({
                where: { name: transaction.assetName },
                data: {
                  totalUnits: newTotalUnits,
                  lastPriceUpdate: new Date(),
                },
              });
            }
          } else if (transaction.type === 'VENTA') {
            const newTotalUnits = asset.totalUnits + transaction.units;
            await tx.asset.update({
              where: { name: transaction.assetName },
              data: {
                totalUnits: newTotalUnits,
                lastPriceUpdate: new Date(),
              },
            });
          }
        }
      }

      // Eliminar la transacción solo si todo lo anterior fue exitoso
      await tx.transaction.delete({
        where: { id },
      });
    });
  }
} 
import { PrismaClient } from '@prisma/client';
import type { Transaction } from '../types/index';

const prisma = new PrismaClient();

// Lista cacheada de ids de CoinGecko más comunes (puedes expandirla o cargarla de un archivo/api en el futuro)
const COINGECKO_IDS = [
  'bitcoin', 'ethereum', 'tether', 'binancecoin', 'solana', 'usd-coin', 'ripple', 'dogecoin', 'cardano',
  'avalanche-2', 'tron', 'polkadot', 'chainlink', 'polygon', 'litecoin', 'uniswap', 'bitcoin-cash',
  'stellar', 'internet-computer', 'filecoin', 'dai', 'aptos', 'arbitrum', 'vechain', 'maker', 'monero',
  'kaspa', 'render-token', 'optimism', 'the-graph', 'fantom', 'aave', 'eos', 'tezos', 'neo', 'iota',
  'waves', 'dash', 'zcash', 'chiliz', 'pancakeswap-token', 'curve-dao-token', 'frax', 'gala', 'mina-protocol',
  'osmosis', '1inch', 'basic-attention-token', 'enjincoin', 'ankr', 'celo', 'ocean-protocol', 'livepeer',
  'convex-finance', 'balancer', 'sushi', 'injective-protocol', 'terra-luna', 'terra-luna-2', 'terrausd',
  'lido-dao', 'rocket-pool', 'staked-ether', 'wrapped-bitcoin', 'compound-governance-token', 'yearn-finance',
  'synthetix-network-token', 'decentraland', 'the-sandbox', 'axie-infinity', 'flow', 'immutable-x', 'gmx',
  'blur', 'bonk', 'pepe', 'floki', 'shiba-inu', 'safe', 'celestia', 'mantle', 'semaphore', 'other' // 'other' para pruebas
];

// Función para convertir de PrismaTransaction a Transaction
function convertPrismaTransactionToTransaction(prismaTransaction: any): Transaction {
  return {
    ...prismaTransaction,
    date: new Date(prismaTransaction.date),
    createdAt: new Date(prismaTransaction.createdAt),
    updatedAt: new Date(prismaTransaction.updatedAt),
  };
}

export class TransactionService {
  async createTransaction(data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    // Validación: si es cripto, assetName debe ser un id válido de CoinGecko
    if ((data.assetType === 'CRYPTO' || (!data.assetType && data.type === 'COMPRA')) && data.assetName) {
      const id = data.assetName.toLowerCase();
      if (!COINGECKO_IDS.includes(id)) {
        throw new Error(`El id de CoinGecko '${data.assetName}' no es válido o no está soportado. Selecciona la criptomoneda desde la lista.`);
      }
    }
    const transaction = await prisma.transaction.create({
      data: {
        date: new Date(data.date),
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        units: data.units || null,
        assetName: data.assetName || null,
        notes: data.notes || null,
      },
    });

    // Si es una compra o venta, actualizar el asset
    if ((data.type === 'COMPRA' || data.type === 'VENTA') && data.assetName && data.units) {
      await this.updateAssetAfterTransaction(data);
    }

    return convertPrismaTransactionToTransaction(transaction);
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
            updatedAt: new Date(),
          },
        });
      } else {
        // Crear nuevo asset
        await prisma.asset.create({
          data: {
            name: data.assetName!,
            symbol: data.assetName!, // Usar el id de CoinGecko como symbol
            type: data.assetType || 'CRYPTO', // Usar el tipo recibido o CRYPTO por defecto
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
          updatedAt: new Date(),
        },
      });
    }
  }

  async getAllTransactions(): Promise<Transaction[]> {
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: 'desc' },
    });
    return transactions.map(convertPrismaTransactionToTransaction);
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });
    return transaction ? convertPrismaTransactionToTransaction(transaction) : null;
  }

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction> {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new Error('Transacción no encontrada');
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
    });

    return convertPrismaTransactionToTransaction(updatedTransaction);
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
                  updatedAt: new Date(),
                },
              });
            }
          } else if (transaction.type === 'VENTA') {
            const newTotalUnits = asset.totalUnits + transaction.units;
            await tx.asset.update({
              where: { name: transaction.assetName },
              data: {
                totalUnits: newTotalUnits,
                updatedAt: new Date(),
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
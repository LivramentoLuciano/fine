import { Request, Response } from 'express';
import { TransactionService } from '../services/TransactionService';
import type { Transaction } from '../types/index';

const transactionService = new TransactionService();

export class TransactionController {
  async createTransaction(req: Request, res: Response) {
    try {
      const data = req.body as Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;
      const transaction = await transactionService.createTransaction(data);
      res.json(transaction);
    } catch (error) {
      console.error('Error creating transaction:', error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error creating transaction' });
      }
    }
  }

  async getAllTransactions(_req: Request, res: Response) {
    try {
      const transactions = await transactionService.getAllTransactions();
      res.json(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ error: 'Error fetching transactions' });
    }
  }

  async getTransactionById(_req: Request, res: Response) {
    try {
      const { id } = _req.params;
      const transaction = await transactionService.getTransactionById(id);

      if (!transaction) {
        return res.status(404).json({ error: 'Transacción no encontrada' });
      }

      return res.json(transaction);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      } else {
        return res.status(500).json({ error: 'Error fetching transaction' });
      }
    }
  }

  async updateTransaction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body as Partial<Transaction>;
      const transaction = await transactionService.updateTransaction(id, data);
      res.json(transaction);
    } catch (error) {
      console.error('Error updating transaction:', error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error updating transaction' });
      }
    }
  }

  async deleteTransaction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await transactionService.deleteTransaction(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Error deleting transaction' });
      }
    }
  }
} 
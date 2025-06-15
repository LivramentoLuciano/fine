import { Router } from 'express';
import { TransactionController } from '../controllers/TransactionController';
import { validateTransaction } from '../middleware/validation';

export const createTransactionRoutes = () => {
  const router = Router();
  const transactionController = new TransactionController();

  // GET /api/transactions
  router.get('/', transactionController.getAllTransactions);

  // GET /api/transactions/:id
  router.get('/:id', transactionController.getTransactionById);

  // POST /api/transactions
  router.post('/', validateTransaction, transactionController.createTransaction);

  // PUT /api/transactions/:id
  router.put('/:id', validateTransaction, transactionController.updateTransaction);

  // DELETE /api/transactions/:id
  router.delete('/:id', transactionController.deleteTransaction);

  return router;
}; 
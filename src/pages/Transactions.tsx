import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Transaction, TransactionType, Currency, AssetType } from '../types';
import { api } from '../services/api';

// Tipo para el formulario de transacción
type TransactionFormData = {
  date: Date;
  type: TransactionType;
  amount: number;
  currency: Currency;
  assetName?: string;
  assetType?: AssetType;
  units?: number;
  notes?: string;
};

export default function Transactions() {
  const [transaction, setTransaction] = useState<TransactionFormData>({
    date: new Date(),
    type: 'COMPRA',
    amount: 0,
    currency: 'USD',
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    isError: false,
  });

  const loadTransactions = async () => {
    try {
      setLoadingTransactions(true);
      const data = await api.getTransactions();
      // Convertir las fechas de string a Date
      const transactionsWithDates = data.map((t: Transaction) => ({
        ...t,
        date: new Date(t.date),
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
      }));
      setTransactions(transactionsWithDates);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setSnackbar({
        open: true,
        message: 'Error al cargar las transacciones',
        isError: true,
      });
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransaction({
      date: transaction.date,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      assetName: transaction.assetName,
      assetType: transaction.assetType,
      units: transaction.units,
      notes: transaction.notes,
    });
  };

  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;

    try {
      setLoading(true);
      await api.deleteTransaction(transactionToDelete.id);
      await loadTransactions();
      setSnackbar({
        open: true,
        message: 'Transacción eliminada exitosamente',
        isError: false,
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error al eliminar la transacción',
        isError: true,
      });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      // Validaciones básicas
      if (!transaction.date || !transaction.type || !transaction.amount || !transaction.currency) {
        throw new Error('Por favor completa todos los campos requeridos');
      }

      if ((transaction.type === 'COMPRA' || transaction.type === 'VENTA') && 
          (!transaction.assetName || !transaction.units || !transaction.assetType)) {
        throw new Error('Para compras y ventas, el nombre del activo, tipo y las unidades son requeridas');
      }

      const now = new Date();
      const transactionData: Omit<Transaction, 'id'> = {
        date: transaction.date,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        assetName: transaction.assetName,
        assetType: transaction.assetType,
        units: transaction.units,
        notes: transaction.notes,
        createdAt: now,
        updatedAt: now,
      };

      if (editingTransaction) {
        // Actualizar transacción existente
        await api.updateTransaction(editingTransaction.id, transactionData);
        setSnackbar({
          open: true,
          message: 'Transacción actualizada exitosamente',
          isError: false,
        });
      } else {
        // Crear nueva transacción
        await api.createTransaction(transactionData);
        setSnackbar({
          open: true,
          message: 'Transacción guardada exitosamente',
          isError: false,
        });
      }
      
      // Recargar transacciones
      await loadTransactions();
      
      // Resetear el formulario
      setTransaction({
        date: new Date(),
        type: 'COMPRA',
        amount: 0,
        currency: 'USD',
      });
      setEditingTransaction(null);

    } catch (error) {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Error al guardar la transacción',
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setTransaction({
      date: new Date(),
      type: 'COMPRA',
      amount: 0,
      currency: 'USD',
    });
    setEditingTransaction(null);
  };

  const getTransactionTypeLabel = (type: TransactionType) => {
    switch (type) {
      case 'COMPRA':
        return 'Compra';
      case 'VENTA':
        return 'Venta';
      case 'INGRESO':
        return 'Ingreso';
      case 'RETIRO':
        return 'Retiro';
      default:
        return type;
    }
  };

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        {editingTransaction ? 'Editar Transacción' : 'Nueva Transacción'}
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto', mb: 4 }}>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <FormControl fullWidth>
            <InputLabel id="type-label">Tipo de Transacción</InputLabel>
            <Select
              labelId="type-label"
              value={transaction.type}
              label="Tipo de Transacción"
              onChange={(e) => setTransaction({ ...transaction, type: e.target.value as TransactionType })}
            >
              <MenuItem value="COMPRA">Compra</MenuItem>
              <MenuItem value="VENTA">Venta</MenuItem>
              <MenuItem value="INGRESO">Ingreso</MenuItem>
              <MenuItem value="RETIRO">Retiro</MenuItem>
            </Select>
          </FormControl>

          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            <DatePicker
              label="Fecha"
              value={transaction.date}
              onChange={(newDate) => setTransaction({ ...transaction, date: newDate || new Date() })}
            />
          </LocalizationProvider>

          <FormControl fullWidth>
            <InputLabel id="currency-label">Moneda</InputLabel>
            <Select
              labelId="currency-label"
              value={transaction.currency}
              label="Moneda"
              onChange={(e) => setTransaction({ ...transaction, currency: e.target.value as Currency })}
            >
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="ARS">ARS</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Monto"
            type="number"
            value={transaction.amount || ''}
            onChange={(e) => setTransaction({ ...transaction, amount: parseFloat(e.target.value) })}
            fullWidth
            required
          />

          {(transaction.type === 'COMPRA' || transaction.type === 'VENTA') && (
            <>
              <FormControl fullWidth>
                <InputLabel id="asset-type-label">Tipo de Activo</InputLabel>
                <Select
                  labelId="asset-type-label"
                  value={transaction.assetType || ''}
                  label="Tipo de Activo"
                  onChange={(e) => setTransaction({ ...transaction, assetType: e.target.value as AssetType })}
                >
                  <MenuItem value="CRYPTO">Criptomoneda</MenuItem>
                  <MenuItem value="STOCK">Acción</MenuItem>
                  <MenuItem value="FOREX">Forex</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Nombre del Activo"
                value={transaction.assetName || ''}
                onChange={(e) => setTransaction({ ...transaction, assetName: e.target.value })}
                fullWidth
                required
              />

              <TextField
                label="Unidades"
                type="number"
                value={transaction.units || ''}
                onChange={(e) => setTransaction({ ...transaction, units: parseFloat(e.target.value) })}
                fullWidth
                required
              />
            </>
          )}

          <TextField
            label="Notas"
            multiline
            rows={3}
            value={transaction.notes || ''}
            onChange={(e) => setTransaction({ ...transaction, notes: e.target.value })}
            fullWidth
          />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            {editingTransaction && (
              <Button onClick={handleCancelEdit} variant="outlined">
                Cancelar
              </Button>
            )}
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={24} /> : (editingTransaction ? 'Actualizar' : 'Guardar')}
            </Button>
          </Box>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align="right">Monto</TableCell>
              <TableCell>Moneda</TableCell>
              <TableCell>Activo</TableCell>
              <TableCell align="right">Unidades</TableCell>
              <TableCell>Notas</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{format(t.date, 'dd/MM/yyyy HH:mm')}</TableCell>
                <TableCell>{getTransactionTypeLabel(t.type)}</TableCell>
                <TableCell align="right">{t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                <TableCell>{t.currency}</TableCell>
                <TableCell>{t.assetName || '-'}</TableCell>
                <TableCell align="right">{t.units?.toLocaleString('en-US', { minimumFractionDigits: 8 }) || '-'}</TableCell>
                <TableCell>{t.notes || '-'}</TableCell>
                <TableCell align="center">
                  <Tooltip title="Editar">
                    <IconButton onClick={() => handleEditTransaction(t)} size="small">
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton onClick={() => handleDeleteClick(t)} size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No hay transacciones registradas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleDeleteConfirm} color="error" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        action={
          <IconButton
            size="small"
            color="inherit"
            onClick={() => setSnackbar({ ...snackbar, open: false })}
          >
            ✕
          </IconButton>
        }
      />
    </div>
  );
} 
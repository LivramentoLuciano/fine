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

export default function Transactions() {
  const [transaction, setTransaction] = useState<Partial<Transaction>>({
    date: new Date(),
    type: 'COMPRA',
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
      setTransactions(data);
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
      ...transaction,
      date: new Date(transaction.date),
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
          (!transaction.assetName || !transaction.units)) {
        throw new Error('Para compras y ventas, el nombre del activo y las unidades son requeridas');
      }

      if (editingTransaction) {
        // Actualizar transacción existente
        await api.updateTransaction(editingTransaction.id, transaction as Partial<Transaction>);
        setSnackbar({
          open: true,
          message: 'Transacción actualizada exitosamente',
          isError: false,
        });
      } else {
        // Crear nueva transacción
        await api.createTransaction(transaction as Omit<Transaction, 'id'>);
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
      currency: 'USD',
    });
    setEditingTransaction(null);
  };

  const getTransactionTypeLabel = (type: string) => {
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
                  required
                >
                  <MenuItem value="CRYPTO">Criptomoneda</MenuItem>
                  <MenuItem value="STOCK">Acción</MenuItem>
                  <MenuItem value="FOREX">Divisa</MenuItem>
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
                inputProps={{ 
                  step: 'any',
                  min: '0',
                  inputMode: 'decimal'
                }}
                helperText="Ingrese la cantidad de unidades (admite decimales)"
              />
            </>
          )}

          <TextField
            label="Plataforma"
            value={transaction.plataforma || ''}
            onChange={(e) => setTransaction({ ...transaction, plataforma: e.target.value })}
            fullWidth
          />

          <TextField
            label="Notas"
            multiline
            rows={3}
            value={transaction.notes || ''}
            onChange={(e) => setTransaction({ ...transaction, notes: e.target.value })}
            fullWidth
          />

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ flex: 1 }}
            >
              {loading ? <CircularProgress size={24} /> : (editingTransaction ? 'Actualizar' : 'Guardar')}
            </Button>
            {editingTransaction && (
              <Button
                variant="outlined"
                size="large"
                onClick={handleCancelEdit}
                disabled={loading}
              >
                Cancelar
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      <Typography variant="h4" gutterBottom>
        Historial de Transacciones
      </Typography>

      {loadingTransactions ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Monto</TableCell>
                <TableCell>Moneda</TableCell>
                <TableCell>Activo</TableCell>
                <TableCell>Unidades</TableCell>
                <TableCell>Notas</TableCell>
                <TableCell>Plataforma</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{format(new Date(t.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{getTransactionTypeLabel(t.type)}</TableCell>
                  <TableCell>{t.amount.toFixed(2)}</TableCell>
                  <TableCell>{t.currency}</TableCell>
                  <TableCell>{t.assetName || '-'}</TableCell>
                  <TableCell>{t.units?.toFixed(2) || '-'}</TableCell>
                  <TableCell>{t.notes || '-'}</TableCell>
                  <TableCell>{t.plataforma || '-'}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton
                        size="small"
                        onClick={() => handleEditTransaction(t)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(t)}
                        color="error"
                      >
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
      )}

      {/* Diálogo de confirmación para eliminar */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        ContentProps={{
          sx: { bgcolor: snackbar.isError ? 'error.main' : 'success.main' }
        }}
      />
    </div>
  );
} 
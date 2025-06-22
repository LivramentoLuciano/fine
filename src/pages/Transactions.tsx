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
  useTheme,
  useMediaQuery,
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
import Autocomplete from '@mui/material/Autocomplete';
import { useAssets } from '../core/hooks/useAssets';

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
  plataforma?: string;
};

// Helper para comparar asset type de forma robusta
const isCryptoType = (type: string | undefined) => (type || '').toUpperCase() === 'CRYPTO';

export default function Transactions() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Traer los assets para autocompletar assetType y plataforma
  const { assets } = useAssets();

  const [transaction, setTransaction] = useState<TransactionFormData>({
    date: new Date(),
    type: 'COMPRA',
    amount: 0,
    currency: 'USD',
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    isError: false,
  });
  const [cryptoList, setCryptoList] = useState<{ id: string; symbol: string; name: string }[]>([]);
  const [cryptoLoading, setCryptoLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadTransactions = async () => {
    try {
      const data = await api.getTransactions();
      // Los datos ya vienen con fechas convertidas desde el backend
      setTransactions(data);
    } catch (err) {
      console.error('Error loading transactions:', err);
      setSnackbar({
        open: true,
        message: 'Error al cargar las transacciones',
        isError: true,
      });
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  // Descargar lista de criptos de CoinGecko si es necesario
  useEffect(() => {
    if (isCryptoType(transaction.assetType) && cryptoList.length === 0) {
      setCryptoLoading(true);
      fetch('https://api.coingecko.com/api/v3/coins/list')
        .then(res => res.json())
        .then(data => setCryptoList(data))
        .catch(() => setCryptoList([]))
        .finally(() => setCryptoLoading(false));
    }
  }, [transaction.assetType, cryptoList.length]);

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
      plataforma: transaction.plataforma,
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
    } catch {
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
    setFormError(null);
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
      // Validación de cripto
      if (isCryptoType(transaction.assetType)) {
        if (!transaction.assetName || !cryptoList.some(c => c.id === transaction.assetName)) {
          setFormError('Debes seleccionar una criptomoneda válida de la lista.');
          setLoading(false);
          return;
        }
      }
      const now = new Date();
      // Si es compra/venta, aseguro que assetType esté seteado correctamente
      let assetTypeToSet = transaction.assetType;
      if ((transaction.type === 'COMPRA' || transaction.type === 'VENTA') && !assetTypeToSet) {
        // Buscar el asset en la lista de assets y tomar su type
        const asset = assets.find(a => a.symbol === transaction.assetName);
        if (asset) assetTypeToSet = asset.type;
      }
      const transactionData: Omit<Transaction, 'id'> = {
        date: transaction.date,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        assetName: transaction.assetName,
        assetType: assetTypeToSet,
        units: transaction.units,
        notes: transaction.notes,
        plataforma: transaction.plataforma,
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
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
          {/* Header */}
          <Typography variant={isMobile ? "h5" : "h4"} component="h1" gutterBottom>
            {editingTransaction ? 'Editar Transacción' : 'Nueva Transacción'}
          </Typography>

          {/* Formulario */}
          <Paper sx={{ p: 3, maxWidth: 600, mb: 4, width: '100%' }}>
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

              <DatePicker
                label="Fecha"
                value={transaction.date}
                onChange={(newDate) => setTransaction({ ...transaction, date: newDate || new Date() })}
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
              />

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
                  <FormControl fullWidth margin="dense">
                    <InputLabel>Tipo de Activo</InputLabel>
                    <Select
                      value={transaction.assetType || ''}
                      label="Tipo de Activo"
                      onChange={e => setTransaction(prev => ({ ...prev, assetType: (e.target.value as string).toUpperCase() as AssetType, assetName: '' }))}
                    >
                      <MenuItem value="CRYPTO">Criptomoneda</MenuItem>
                      <MenuItem value="STOCK">Acción</MenuItem>
                      <MenuItem value="FOREX">Divisa</MenuItem>
                    </Select>
                  </FormControl>

                  {/* Autocompletado solo para CRYPTO */}
                  {isCryptoType(transaction.assetType) ? (
                    <Autocomplete
                      options={cryptoList}
                      loading={cryptoLoading}
                      filterOptions={(options, { inputValue }) => {
                        const input = inputValue.trim().toLowerCase();
                        if (input.length < 2) return [];
                        const exactSymbol = options.find(option => option.symbol.toLowerCase() === input);
                        let filtered = options.filter(option =>
                          option.name.toLowerCase().startsWith(input) ||
                          option.symbol.toLowerCase().startsWith(input)
                        );
                        if (exactSymbol) {
                          filtered = [exactSymbol, ...filtered.filter(o => o.id !== exactSymbol.id)];
                        }
                        return filtered.slice(0, 20);
                      }}
                      getOptionLabel={option => `${option.name} (${option.symbol.toUpperCase()})`}
                      value={cryptoList.find(c => c.id === transaction.assetName) || null}
                      onChange={(_e, value) => {
                        setTransaction(prev => ({ ...prev, assetName: value ? value.id : '' }));
                        if (formError) setFormError(null);
                      }}
                      renderInput={params => (
                        <TextField
                          {...params}
                          label="Criptomoneda"
                          margin="dense"
                          required
                          error={!!formError}
                          helperText={
                            formError
                              ? formError
                              : typeof params.inputProps.value === 'string' && params.inputProps.value.length < 2
                                ? 'Escribe al menos 2 letras para buscar.'
                                : 'Busca y selecciona la criptomoneda. El símbolo se autocompleta.'
                          }
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <>
                                {cryptoLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                              </>
                            ),
                          }}
                        />
                      )}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                    />
                  ) : (
                    <TextField
                      margin="dense"
                      label="Nombre del Activo"
                      fullWidth
                      required
                      value={transaction.assetName || ''}
                      onChange={e => setTransaction(prev => ({ ...prev, assetName: e.target.value }))}
                    />
                  )}

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

              <FormControl fullWidth margin="dense">
                <TextField
                  label="Plataforma"
                  value={transaction.plataforma || ''}
                  onChange={e => setTransaction(prev => ({ ...prev, plataforma: e.target.value }))}
                  margin="dense"
                  fullWidth
                />
              </FormControl>

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

          {/* Transactions List */}
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
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No hay transacciones registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((t) => (
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
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Delete Confirmation Dialog */}
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

          {/* Snackbar */}
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
        </Box>
      </LocalizationProvider>
    </div>
  );
} 
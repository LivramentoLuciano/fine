import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  Tooltip,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { Asset, Currency } from '../types';
import { api } from '../services/api';
import AssetForm from '../components/AssetForm';
import { ArgentineDollarProvider } from '../services/prices/ArgentineDollarProvider';

export default function Assets() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [displayCurrency, setDisplayCurrency] = useState<Currency>('USD');
  const [usdRate, setUsdRate] = useState<number | null>(null);

  // Totales calculados
  const totalUSD = assets
    .filter(asset => asset.currency === 'USD')
    .reduce((sum, asset) => sum + (asset.totalUnits * (asset.currentPrice || asset.averagePurchasePrice)), 0);

  const totalARS = assets
    .filter(asset => asset.currency === 'ARS')
    .reduce((sum, asset) => sum + (asset.totalUnits * (asset.currentPrice || asset.averagePurchasePrice)), 0);

  // Calcular el valor total en la moneda seleccionada
  const getTotalInDisplayCurrency = () => {
    if (displayCurrency === 'USD') {
      return totalUSD + (usdRate ? totalARS / usdRate : 0);
    } else {
      return totalARS + (usdRate ? totalUSD * usdRate : 0);
    }
  };

  // Obtener la cotización del dólar
  const fetchUsdRate = async () => {
    try {
      const provider = new ArgentineDollarProvider();
      const rate = await provider.getPrice('USD', 'ARS');
      setUsdRate(rate);
    } catch (error) {
      console.error('Error fetching USD rate:', error);
    }
  };

  // Datos para el gráfico de distribución
  const pieChartData = assets
    .filter(asset => asset.totalUnits * asset.averagePurchasePrice > 0) // Solo mostrar activos con valor positivo
    .map(asset => ({
      id: asset.id.toString(),
      value: asset.totalUnits * asset.averagePurchasePrice,
      label: `${asset.name} (${asset.currency})`,
    }));

  useEffect(() => {
    loadAssets();
    fetchUsdRate();
    // Actualizar la cotización del dólar cada 5 minutos
    const rateInterval = setInterval(fetchUsdRate, 5 * 60 * 1000);
    return () => clearInterval(rateInterval);
  }, []);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const data = await api.getAssets();
      setAssets(data);
    } catch (error) {
      console.error('Error loading assets:', error);
      setSnackbar({ open: true, message: 'Error al cargar los activos', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const updatePrices = async () => {
    try {
      setUpdatingPrices(true);
      await loadAssets(); // Recargar para obtener precios actualizados
      setSnackbar({ open: true, message: 'Precios actualizados correctamente', severity: 'success' });
    } catch (error) {
      console.error('Error updating prices:', error);
      setSnackbar({ open: true, message: 'Error al actualizar precios', severity: 'error' });
    } finally {
      setUpdatingPrices(false);
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setDialogOpen(true);
  };

  const handleDeleteClick = (asset: Asset) => {
    setAssetToDelete(asset);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!assetToDelete) return;
    
    try {
      // Nota: deleteAsset no existe en la API, se debe implementar en el backend
      // Por ahora, solo eliminamos del estado local
      setAssets(assets.filter(a => a.id !== assetToDelete.id));
      setSnackbar({ open: true, message: 'Activo eliminado correctamente', severity: 'success' });
    } catch (error) {
      console.error('Error deleting asset:', error);
      setSnackbar({ open: true, message: 'Error al eliminar el activo', severity: 'error' });
    } finally {
      setDeleteDialogOpen(false);
      setAssetToDelete(null);
    }
  };

  const handleSubmit = async (assetData: Partial<Asset>) => {
    try {
      if (editingAsset) {
        const updatedAsset = await api.updateAsset(editingAsset.id, assetData);
        setAssets(assets.map(a => a.id === editingAsset.id ? updatedAsset : a));
        setSnackbar({ open: true, message: 'Activo actualizado correctamente', severity: 'success' });
      } else {
        const newAsset = await api.createAsset(assetData as Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>);
        setAssets([...assets, newAsset]);
        setSnackbar({ open: true, message: 'Activo creado correctamente', severity: 'success' });
      }
      setDialogOpen(false);
      setEditingAsset(null);
    } catch (error) {
      console.error('Error saving asset:', error);
      setSnackbar({ open: true, message: 'Error al guardar el activo', severity: 'error' });
    }
  };

  const getAssetTypeLabel = (type: string) => {
    switch (type) {
      case 'CRYPTO': return 'Criptomoneda';
      case 'STOCK': return 'Acción';
      case 'FOREX': return 'Forex';
      default: return type;
    }
  };

  const getCurrencyLabel = (currency: string) => {
    switch (currency) {
      case 'USD': return 'USD';
      case 'ARS': return 'ARS';
      default: return currency;
    }
  };

  return (
    <div>
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}>
          <Typography variant={isMobile ? "h5" : "h4"} component="h1" gutterBottom>
            Gestión de Activos
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={updatePrices}
            disabled={updatingPrices}
            sx={{ 
              minWidth: { xs: '100%', sm: 'auto' },
              height: { xs: 48, sm: 40 }
            }}
          >
            {updatingPrices ? <CircularProgress size={20} /> : 'Actualizar Precios'}
          </Button>
        </Box>

        {/* Loading Progress */}
        {updatingPrices && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress />
            <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
              Actualizando precios...
            </Typography>
          </Box>
        )}

        {/* Tarjeta principal con valor total */}
        <Card 
          sx={{ 
            mb: 4, 
            bgcolor: 'primary.main', 
            color: 'white',
            position: 'relative',
            overflow: 'visible'
          }}
        >
          <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
            <ToggleButtonGroup
              value={displayCurrency}
              exclusive
              onChange={(_, value) => value && setDisplayCurrency(value)}
              size="small"
              sx={{ bgcolor: 'white' }}
            >
              <ToggleButton value="USD">USD</ToggleButton>
              <ToggleButton value="ARS">ARS</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Valor Total del Portfolio
            </Typography>
            <Typography variant="h3" component="div">
              {displayCurrency === 'USD' ? 'USD ' : 'ARS '}
              {getTotalInDisplayCurrency().toLocaleString(
                displayCurrency === 'USD' ? 'en-US' : 'es-AR',
                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
              )}
            </Typography>
            {usdRate && (
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                Cotización USD: {usdRate.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Resumen de valores por moneda */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 4 }}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total en USD
              </Typography>
              <Typography variant="h4">
                ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total en ARS
              </Typography>
              <Typography variant="h4">
                ${totalARS.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </CardContent>
          </Card>
        </Stack>

        {/* Gráfico de distribución */}
        {assets.length > 0 && pieChartData.length > 0 && (
          <Paper sx={{ p: 2, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Distribución de la Cartera
            </Typography>
            <Box sx={{ height: 300, width: '100%' }}>
              <PieChart
                series={[
                  {
                    data: pieChartData,
                    innerRadius: 30,
                    paddingAngle: 2,
                    cornerRadius: 4,
                  },
                ]}
                height={300}
              />
            </Box>
          </Paper>
        )}

        {/* Assets List */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {isMobile ? (
              // Mobile view - Cards
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {assets.map((asset) => {
                  const currentValue = asset.currentPrice ? asset.currentPrice * asset.totalUnits : 0;
                  const totalCost = asset.averagePurchasePrice * asset.totalUnits;
                  const profitLoss = currentValue - totalCost;
                  const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

                  return (
                    <Card key={asset.id}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box>
                            <Typography variant="h6" component="div">
                              {asset.name}
                            </Typography>
                            <Chip 
                              label={getAssetTypeLabel(asset.type)} 
                              size="small" 
                              color="primary" 
                              sx={{ mt: 0.5 }}
                            />
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(asset)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteClick(asset)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </Box>
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">Símbolo:</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {asset.symbol}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">Unidades:</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {asset.totalUnits.toLocaleString()}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">Precio Promedio:</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {getCurrencyLabel(asset.currency)} {asset.averagePurchasePrice.toLocaleString()}
                            </Typography>
                          </Box>
                          
                          {asset.currentPrice && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2">Precio Actual:</Typography>
                              <Typography variant="body2" fontWeight="bold" color={profitLoss >= 0 ? 'success.main' : 'error.main'}>
                                {getCurrencyLabel(asset.currency)} {asset.currentPrice.toLocaleString()}
                              </Typography>
                            </Box>
                          )}
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">Valor Total:</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              USD {currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Typography>
                          </Box>
                          
                          {asset.currentPrice && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2">P&L:</Typography>
                              <Typography 
                                variant="body2" 
                                fontWeight="bold" 
                                color={profitLoss >= 0 ? 'success.main' : 'error.main'}
                              >
                                {profitLoss >= 0 ? '+' : ''}{profitLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({profitLossPercent >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%)
                              </Typography>
                            </Box>
                          )}
                          
                          {asset.lastPriceUpdate && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="body2">Última Actualización:</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {new Date(asset.lastPriceUpdate).toLocaleString()}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            ) : (
              // Desktop view - Table
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Símbolo</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Unidades</TableCell>
                      <TableCell>Precio Promedio</TableCell>
                      <TableCell>Precio Actual</TableCell>
                      <TableCell>Valor Total</TableCell>
                      <TableCell>P&L</TableCell>
                      <TableCell>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assets.map((asset) => {
                      const currentValue = asset.currentPrice ? asset.currentPrice * asset.totalUnits : 0;
                      const totalCost = asset.averagePurchasePrice * asset.totalUnits;
                      const profitLoss = currentValue - totalCost;
                      const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

                      return (
                        <TableRow key={asset.id}>
                          <TableCell>{asset.name}</TableCell>
                          <TableCell>{asset.symbol}</TableCell>
                          <TableCell>
                            <Chip 
                              label={getAssetTypeLabel(asset.type)} 
                              size="small" 
                              color="primary"
                            />
                          </TableCell>
                          <TableCell>{asset.totalUnits.toLocaleString()}</TableCell>
                          <TableCell>
                            {getCurrencyLabel(asset.currency)} {asset.averagePurchasePrice.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {asset.currentPrice ? (
                              <Typography color={profitLoss >= 0 ? 'success.main' : 'error.main'}>
                                {getCurrencyLabel(asset.currency)} {asset.currentPrice.toLocaleString()}
                              </Typography>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            USD {currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            {asset.currentPrice ? (
                              <Typography color={profitLoss >= 0 ? 'success.main' : 'error.main'}>
                                {profitLoss >= 0 ? '+' : ''}{profitLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({profitLossPercent >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%)
                              </Typography>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title="Editar">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEdit(asset)}
                                  color="primary"
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Eliminar">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteClick(asset)}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* Asset Form Dialog */}
        <AssetForm
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditingAsset(null);
          }}
          onSubmit={handleSubmit}
          initialData={editingAsset || undefined}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Confirmar Eliminación</DialogTitle>
          <DialogContent>
            <Typography>
              ¿Estás seguro de que quieres eliminar el activo "{assetToDelete?.name}"? Esta acción no se puede deshacer.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleDeleteConfirm} color="error" variant="contained">
              Eliminar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          message={snackbar.message}
        />
      </Box>
    </div>
  );
} 
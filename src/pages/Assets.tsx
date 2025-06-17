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
  CircularProgress,
  Stack,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Button,
} from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import type { Asset, AssetType, Currency } from '../types';
import { api } from '../services/api';
import AssetForm from '../components/AssetForm';
import { ArgentineDollarProvider } from '../services/prices/ArgentineDollarProvider';

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>();
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

  const loadAssets = async () => {
    try {
      setLoading(true);
      const data = await api.getAssets();
      setAssets(data);
      setError(null);
    } catch (err) {
      console.error('Error loading assets:', err);
      setError('Error al cargar los activos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
    fetchUsdRate();
    // Actualizar la cotización del dólar cada 5 minutos
    const rateInterval = setInterval(fetchUsdRate, 5 * 60 * 1000);
    return () => clearInterval(rateInterval);
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setFormOpen(true);
  };

  const handleSubmitAsset = async (assetData: Partial<Asset>) => {
    try {
      if (selectedAsset) {
        // Aseguramos que los campos requeridos estén presentes
        const updateData = {
          symbol: assetData.symbol || selectedAsset.symbol,
          type: (assetData.type || selectedAsset.type) as AssetType,
        };
        await api.updateAsset(selectedAsset.id, updateData);
        handleRefresh();
      }
    } catch (error) {
      console.error('Error updating asset:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" minHeight="400px" gap={2}>
        <Typography color="error">{error}</Typography>
        <Button variant="contained" onClick={handleRefresh}>
          Reintentar
        </Button>
      </Box>
    );
  }

  return (
    <div>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Gestión de Activos
        </Typography>
        <Tooltip title="Actualizar datos">
          <IconButton onClick={handleRefresh} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

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

      {/* Tabla de activos */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Símbolo</TableCell>
              <TableCell align="right">Unidades</TableCell>
              <TableCell align="right">Precio Promedio</TableCell>
              <TableCell align="right">Precio Actual</TableCell>
              <TableCell align="right">Valor Total</TableCell>
              <TableCell>Moneda</TableCell>
              <TableCell>Última Actualización</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assets.map((asset) => (
              <TableRow 
                key={asset.id}
                sx={{ '&:hover': { backgroundColor: 'action.hover' } }}
              >
                <TableCell component="th" scope="row">
                  {asset.name}
                </TableCell>
                <TableCell>{asset.symbol}</TableCell>
                <TableCell align="right">
                  {asset.totalUnits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                </TableCell>
                <TableCell align="right">
                  {asset.averagePurchasePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell align="right">
                  {asset.currentPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '-'}
                </TableCell>
                <TableCell align="right">
                  {((asset.currentPrice || asset.averagePurchasePrice) * asset.totalUnits).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell>{asset.currency}</TableCell>
                <TableCell>
                  {asset.lastPriceUpdate ? new Date(asset.lastPriceUpdate).toLocaleString() : '-'}
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => handleEditAsset(asset)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {assets.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No hay activos registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <AssetForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmitAsset}
        initialData={selectedAsset}
      />
    </div>
  );
} 
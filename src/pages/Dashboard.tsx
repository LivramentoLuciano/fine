import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { useState, useEffect } from 'react';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { api } from '../services/api';
import type { Asset } from '../types';
import { PriceServiceFactory } from '../services/prices/PriceServiceFactory';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [updatingPrices, setUpdatingPrices] = useState(false);

  // Calcular totales basados en los activos
  const calculateTotals = () => {
    return assets.reduce((acc, asset) => {
      const currentValue = asset.currentPrice 
        ? asset.totalUnits * asset.currentPrice
        : asset.totalUnits * asset.averagePurchasePrice;
      
      const investedValue = asset.totalUnits * asset.averagePurchasePrice;
      
      if (asset.currency === 'USD') {
        acc.totalInvestedUSD += investedValue;
        acc.currentValueUSD += currentValue;
      } else if (asset.currency === 'ARS') {
        acc.totalInvestedARS += investedValue;
        acc.currentValueARS += currentValue;
      }
      return acc;
    }, {
      totalInvestedUSD: 0,
      totalInvestedARS: 0,
      currentValueUSD: 0,
      currentValueARS: 0,
    });
  };

  // Preparar datos para el gráfico de distribución
  const preparePieChartData = () => {
    return assets
      .filter(asset => {
        const value = asset.currentPrice 
          ? asset.totalUnits * asset.currentPrice
          : asset.totalUnits * asset.averagePurchasePrice;
        return value > 0;
      })
      .map(asset => ({
        id: asset.id,
        value: asset.currentPrice 
          ? asset.totalUnits * asset.currentPrice
          : asset.totalUnits * asset.averagePurchasePrice,
        label: `${asset.name} (${asset.currency})`,
      }));
  };

  // Calcular rendimiento por activo
  const calculatePerformance = (asset: Asset) => {
    if (!asset.currentPrice) return null;
    
    const invested = asset.totalUnits * asset.averagePurchasePrice;
    const current = asset.totalUnits * asset.currentPrice;
    const performance = ((current - invested) / invested) * 100;
    
    return {
      name: asset.name,
      performance,
      currency: asset.currency,
    };
  };

  // Actualizar precios de los activos
  const updatePrices = async () => {
    setUpdatingPrices(true);
    try {
      const updatedAssets = await Promise.all(
        assets.map(async (asset) => {
          try {
            const price = await PriceServiceFactory.updateAssetPrice(asset);
            return {
              ...asset,
              currentPrice: price ?? null,
              lastPriceUpdate: price ? new Date().toISOString() : null,
            };
          } catch (error) {
            console.error(`Error updating price for ${asset.name}:`, error);
            return asset;
          }
        })
      );
      setAssets(updatedAssets);
    } catch (err) {
      console.error('Error updating prices:', err);
    } finally {
      setUpdatingPrices(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const assetsData = await api.getAssets();
        setAssets(assetsData);
        setError(null);
        // Actualizar precios inmediatamente después de cargar los activos
        await updatePrices();
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Error al cargar los datos del dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Actualizar precios cada 5 minutos
    const priceUpdateInterval = setInterval(updatePrices, 5 * 60 * 1000);
    return () => clearInterval(priceUpdateInterval);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  const totals = calculateTotals();
  const pieChartData = preparePieChartData();
  const performanceData = assets
    .map(calculatePerformance)
    .filter((perf): perf is NonNullable<typeof perf> => perf !== null);

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Dashboard {updatingPrices && <CircularProgress size={20} sx={{ ml: 2 }} />}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Primera fila: Totales */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              flex: 1,
              minWidth: 300,
            }}
          >
            <Typography variant="h6" gutterBottom>
              Total Invertido
            </Typography>
            <Typography variant="h4" component="div">
              USD {totals.totalInvestedUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography color="text.secondary">
              ARS {totals.totalInvestedARS.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </Paper>

          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              flex: 1,
              minWidth: 300,
            }}
          >
            <Typography variant="h6" gutterBottom>
              Valor Actual
            </Typography>
            <Typography variant="h4" component="div" color={totals.currentValueUSD >= totals.totalInvestedUSD ? 'success.main' : 'error.main'}>
              USD {totals.currentValueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <Typography color={totals.currentValueARS >= totals.totalInvestedARS ? 'success.main' : 'error.main'}>
              ARS {totals.currentValueARS.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </Paper>
        </Box>

        {/* Segunda fila: Gráficos */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {/* Gráfico de Distribución */}
          <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '300px' }}>
            <Paper sx={{ p: 2, height: '400px' }}>
              <Typography variant="h6" gutterBottom>
                Distribución de Activos
              </Typography>
              {pieChartData.length > 0 ? (
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
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 10 }}>
                  No hay datos suficientes para mostrar el gráfico
                </Typography>
              )}
            </Paper>
          </Box>

          {/* Rendimiento por Activo */}
          <Box sx={{ flex: '1 1 calc(50% - 12px)', minWidth: '300px' }}>
            <Paper sx={{ p: 2, height: '400px' }}>
              <Typography variant="h6" gutterBottom>
                Distribución por Moneda
              </Typography>
              {performanceData.length > 0 ? (
                <BarChart
                  xAxis={[{ 
                    scaleType: 'band', 
                    data: ['USD', 'ARS']
                  }]}
                  series={[
                    {
                      data: [
                        totals.totalInvestedUSD,
                        totals.totalInvestedARS
                      ],
                    },
                  ]}
                  height={300}
                />
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 10 }}>
                  No hay datos suficientes para mostrar el gráfico
                </Typography>
              )}
            </Paper>
          </Box>
        </Box>

        {/* Valor Total */}
        <Paper
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            height: 140,
            bgcolor: 'primary.light',
            color: 'white',
          }}
        >
          <Typography variant="h6" gutterBottom>
            Valor Total del Portfolio
          </Typography>
          <Typography variant="h3" component="div">
            USD {totals.totalInvestedUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Typography>
          <Typography>
            ARS {totals.totalInvestedARS.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Typography>
        </Paper>
      </Box>
    </div>
  );
} 
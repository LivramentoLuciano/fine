import { Box, Paper, Typography, CircularProgress, useTheme, useMediaQuery } from '@mui/material';
import { useState, useEffect } from 'react';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { api } from '../services/api';
import type { Asset, Transaction } from '../types';
import { PriceServiceFactory } from '../services/prices/PriceServiceFactory';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
        const [assetsData, transactionsData] = await Promise.all([
          api.getAssets(),
          api.getTransactions(),
        ]);
        setAssets(assetsData);
        setTransactions(transactionsData);
        setError(null);
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

  // Calcular rendimiento global (USD)
  const investedUSD = transactions
    .filter(t => t.currency === 'USD' && (t.type === 'COMPRA' || t.type === 'INGRESO'))
    .reduce((acc, t) => acc + t.amount, 0) -
    transactions.filter(t => t.currency === 'USD' && t.type === 'VENTA').reduce((acc, t) => acc + t.amount, 0);
  const currentValueUSD = assets.filter(a => a.currency === 'USD').reduce((acc, a) => acc + (a.currentPrice ? a.currentPrice * a.totalUnits : 0), 0);
  const rendimientoUSD = investedUSD > 0 ? ((currentValueUSD - investedUSD) / investedUSD) * 100 : 0;

  // Mensaje de rendimiento
  let rendimientoMsg = '';
  let rendimientoColor = 'info.main';
  let rendimientoEmoji = '💡';
  if (rendimientoUSD > 10) {
    rendimientoMsg = '¡Excelente! Tus inversiones están rindiendo muy bien. ¡Felicitaciones!';
    rendimientoColor = 'success.main';
    rendimientoEmoji = '🎉';
  } else if (rendimientoUSD > 0) {
    rendimientoMsg = '¡Vas por buen camino! Tus inversiones están en positivo.';
    rendimientoColor = 'success.light';
    rendimientoEmoji = '👍';
  } else if (rendimientoUSD < 0) {
    rendimientoMsg = 'Atención: tus inversiones están en negativo. Revisa tu estrategia.';
    rendimientoColor = 'error.main';
    rendimientoEmoji = '⚠️';
  } else {
    rendimientoMsg = 'Aún no hay suficiente información para calcular el rendimiento.';
    rendimientoColor = 'info.main';
    rendimientoEmoji = '💡';
  }

  // Calcular evolución del dinero (USD)
  // Ordenar transacciones por fecha ascendente
  const sortedTx = [...transactions.filter(t => t.currency === 'USD')].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let real = 0;
  let sinInvertir = 0;
  const realSeries: { x: string, y: number }[] = [];
  const sinInvertirSeries: { x: string, y: number }[] = [];
  sortedTx.forEach(t => {
    if (t.type === 'INGRESO') {
      real += t.amount;
      sinInvertir += t.amount;
    } else if (t.type === 'RETIRO') {
      real -= t.amount;
      sinInvertir -= t.amount;
    } else if (t.type === 'COMPRA') {
      real -= t.amount;
    } else if (t.type === 'VENTA') {
      real += t.amount;
    }
    const fecha = new Date(t.date).toLocaleDateString();
    realSeries.push({ x: fecha, y: real });
    sinInvertirSeries.push({ x: fecha, y: sinInvertir });
  });

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Dashboard {updatingPrices && <CircularProgress size={20} sx={{ ml: 2 }} />}
      </Typography>

      {/* Cartel de valor total del portfolio (ahora arriba de todo) */}
      <Paper
        sx={{
          p: 2,
          mb: 2,
          bgcolor: 'primary.light',
          color: 'white',
          textAlign: 'center',
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

      {/* Cartel de rendimiento global */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: rendimientoColor, color: 'white', textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          {rendimientoEmoji} Rendimiento Global USD: {rendimientoUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
        </Typography>
        <Typography>{rendimientoMsg}</Typography>
      </Paper>

      {/* Gráfico de evolución del dinero */}
      <Paper sx={{ p: 2, mb: 2, overflowX: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Evolución del dinero (USD): Real vs Sin Invertir
        </Typography>
        <LineChart
          xAxis={[{ data: realSeries.map(p => p.x), label: 'Fecha' }]}
          series={[
            { data: realSeries.map(p => p.y), label: 'Evolución Real', color: '#1976d2' },
            { data: sinInvertirSeries.map(p => p.y), label: 'Sin Invertir', color: '#e57373' },
          ]}
          height={isMobile ? 200 : 300}
          width={isMobile ? 320 : undefined}
        />
      </Paper>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Primera fila: Totales (ya no incluye el valor total, solo totales invertidos y valor actual) */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              flex: 1,
              minWidth: 200,
              mb: isMobile ? 2 : 0,
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
              minWidth: 200,
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
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, flexDirection: isMobile ? 'column' : 'row' }}>
          {/* Gráfico de Distribución */}
          <Box sx={{ flex: isMobile ? '1 1 100%' : '1 1 calc(50% - 12px)', minWidth: isMobile ? '100%' : '300px' }}>
            <Paper sx={{ p: 2, height: isMobile ? 'auto' : '400px', mb: isMobile ? 2 : 0 }}>
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
                  height={isMobile ? 200 : 300}
                  width={isMobile ? 320 : undefined}
                />
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 5 }}>
                  No hay datos suficientes para mostrar el gráfico
                </Typography>
              )}
            </Paper>
          </Box>

          {/* Rendimiento por Activo */}
          <Box sx={{ flex: isMobile ? '1 1 100%' : '1 1 calc(50% - 12px)', minWidth: isMobile ? '100%' : '300px' }}>
            <Paper sx={{ p: 2, height: isMobile ? 'auto' : '400px' }}>
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
                  height={isMobile ? 200 : 300}
                  width={isMobile ? 320 : undefined}
                />
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 5 }}>
                  No hay datos suficientes para mostrar el gráfico
                </Typography>
              )}
            </Paper>
          </Box>
        </Box>
      </Box>
    </div>
  );
} 
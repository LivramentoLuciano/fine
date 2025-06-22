import { Box, Paper, Typography, CircularProgress, useTheme, useMediaQuery, TableContainer, Table, TableHead, TableBody, TableRow, TableCell } from '@mui/material';
import { useState, useEffect, useRef } from 'react';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { api } from '../services/api';
import type { Asset, Transaction } from '../types';
import { PriceServiceFactory } from '../services/prices/PriceServiceFactory';
import { HistoricalPriceService } from '../services/HistoricalPriceService';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assetsBase, setAssetsBase] = useState<Asset[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [patrimonioSeries, setPatrimonioSeries] = useState<{ x: Date, y: number }[]>([]);
  const [activosDetallePorFecha, setActivosDetallePorFecha] = useState<{ [fecha: string]: { symbol: string; type: string | undefined; units: number; price: number | null; valor: number }[] }>({});
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const patrimonioSeriesRef = useRef(patrimonioSeries);
  patrimonioSeriesRef.current = patrimonioSeries;
  
  // Instancia del servicio de precios históricos
  const historicalPriceService = new HistoricalPriceService();

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
  const updatePrices = async (assetsToUpdate = assetsBase) => {
    setUpdatingPrices(true);
    try {
      const updatedAssets = await Promise.all(
        assetsToUpdate.map(async (asset) => {
          try {
            const price = await PriceServiceFactory.updateAssetPrice(asset);
            return {
              ...asset,
              currentPrice: price ?? null,
              lastPriceUpdate: price ? new Date().toISOString() : null,
            };
          } catch (error) {
            console.error(`[DEBUG] Error updating price for ${asset.name}:`, error);
            // Devuelvo el asset original aunque falle el precio
            return { ...asset, currentPrice: null };
          }
        })
      );
      setAssets(updatedAssets);
    } catch (err) {
      console.error('Error updating prices:', err);
      // Si todo falla, igual seteo los assets originales
      setAssets(assetsToUpdate.map(a => ({ ...a, currentPrice: null })));
    } finally {
      setUpdatingPrices(false);
    }
  };

  // Utilidad para obtener el valor de los activos en una fecha
  async function getAssetsValueAtDate(
    assets: Asset[],
    transactions: Transaction[],
    date: string,
    useCurrentPriceIfToday = false
  ): Promise<number> {
    const activos: {
      [key: string]: { units: number; type: string | undefined; symbol: string; assetObj?: Asset };
    } = {};
    transactions.forEach((t: Transaction) => {
      const tDateStr = (typeof t.date === 'string' ? t.date : new Date(t.date).toISOString()).slice(0, 10);
      const dateStr = (typeof date === 'string' ? date : new Date(date).toISOString()).slice(0, 10);
      if (tDateStr > dateStr) return;
      if (!t.assetName || !t.assetType || !t.units) return;
      const key = t.assetName + '_' + (t.assetType || '');
      if (!activos[key]) {
        activos[key] = { units: 0, type: t.assetType, symbol: t.assetName, assetObj: assets.find(a => a.symbol === t.assetName) };
      }
      if (t.type === 'COMPRA') activos[key].units += t.units;
      if (t.type === 'VENTA') activos[key].units -= t.units;
    });
    let total = 0;
    for (const key in activos) {
      const { units, type, symbol, assetObj } = activos[key];
      if (units <= 0) continue;
      let price: number | null = null;
      const isToday = (() => {
        const d = new Date(date);
        const now = new Date();
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
      })();
      if (isToday && useCurrentPriceIfToday && assetObj && assetObj.currentPrice) {
        price = assetObj.currentPrice;
      } else if (assetObj) {
        // Usar el nuevo servicio de precios históricos
        price = await historicalPriceService.getHistoricalPrice(assetObj, new Date(date));
      }
      // LOG de depuración
      console.log(`[DEBUG] Fecha: ${date}, Activo: ${symbol}, Tipo: ${type}, Unidades: ${units}, Precio: ${price}`);
      if (price) total += units * price;
    }
    return total;
  }

  // Utilidad para obtener el array de fechas diarias entre dos fechas (inclusive)
  function getDateRange(from: Date, to: Date): Date[] {
    const dates: Date[] = [];
    let current = new Date(from);
    while (current <= to) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  // Nueva utilidad: obtener detalle de activos por fecha
  async function getActivosDetallePorFecha(
    assets: Asset[],
    transactions: Transaction[],
    date: string,
    useCurrentPriceIfToday = false
  ): Promise<{ symbol: string; type: string | undefined; units: number; price: number | null; valor: number }[]> {
    const activos: {
      [key: string]: { units: number; type: string | undefined; symbol: string; assetObj?: Asset };
    } = {};
    transactions.forEach((t: Transaction) => {
      const tDateStr = (typeof t.date === 'string' ? t.date : new Date(t.date).toISOString()).slice(0, 10);
      const dateStr = (typeof date === 'string' ? date : new Date(date).toISOString()).slice(0, 10);
      if (tDateStr > dateStr) return;
      if (!t.assetName || !t.assetType || !t.units) return;
      const key = t.assetName + '_' + (t.assetType || '');
      if (!activos[key]) {
        activos[key] = { units: 0, type: t.assetType, symbol: t.assetName, assetObj: assets.find(a => a.symbol === t.assetName) };
      }
      if (t.type === 'COMPRA') activos[key].units += t.units;
      if (t.type === 'VENTA') activos[key].units -= t.units;
    });
    const detalles: { symbol: string; type: string | undefined; units: number; price: number | null; valor: number }[] = [];
    for (const key in activos) {
      const { units, type, symbol, assetObj } = activos[key];
      if (units <= 0) continue;
      let price: number | null = null;
      const isToday = (() => {
        const d = new Date(date);
        const now = new Date();
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
      })();
      if (isToday && useCurrentPriceIfToday && assetObj && assetObj.currentPrice) {
        price = assetObj.currentPrice;
      } else if (assetObj) {
        // Usar el nuevo servicio de precios históricos
        price = await historicalPriceService.getHistoricalPrice(assetObj, new Date(date));
      }
      detalles.push({ symbol, type, units, price, valor: price ? units * price : 0 });
    }
    return detalles;
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [assetsData, transactionsData] = await Promise.all([
          api.getAssets(),
          api.getTransactions(),
        ]);
        console.log('[DEBUG] assetsData:', assetsData);
        console.log('[DEBUG] transactionsData:', transactionsData);
        setAssetsBase(assetsData);
        setTransactions(transactionsData);
        setError(null);
      } catch (err) {
        console.error('[DEBUG] Error loading dashboard data:', err);
        setError('Error al cargar los datos del dashboard: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
    };
    loadData();
    // Actualizar precios cada 5 minutos
    const priceUpdateInterval = setInterval(() => updatePrices(assetsBase), 5 * 60 * 1000);
    return () => clearInterval(priceUpdateInterval);
  }, []);

  // Solo actualizar precios cuando cambian los assets base
  useEffect(() => {
    if (assetsBase.length > 0) {
      console.log('[DEBUG] updatePrices triggered with assetsBase:', assetsBase);
      updatePrices(assetsBase);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetsBase]);

  useEffect(() => {
    if (assets.length === 0) console.warn('[DEBUG] assets está vacío');
    if (transactions.length === 0) console.warn('[DEBUG] transactions está vacío');
  }, [assets, transactions]);

  useEffect(() => {
    async function calcularPatrimonio() {
      if (transactions.length === 0) {
        console.warn('[DEBUG] calcularPatrimonio: transactions vacío');
        return;
      }
      // Encontrar la fecha del primer ingreso
      const primerIngreso = transactions.reduce((min, t) => {
        const d = new Date(t.date);
        return (!min || d < min) ? d : min;
      }, null as Date | null);
      const hoy = new Date();
      if (!primerIngreso) {
        console.warn('[DEBUG] calcularPatrimonio: no hay primerIngreso');
        return;
      }
      const fechas = getDateRange(primerIngreso, hoy).filter(f => f <= hoy); // Ignorar fechas futuras
      let patrimonio: { x: Date, y: number }[] = [];
      for (const fecha of fechas) {
        const fechaStr = fecha.toISOString().slice(0, 10);
        // Dinero líquido hasta la fecha
        let liquido = 0;
        transactions.forEach(t => {
          if (new Date(t.date) > fecha) return;
          if (t.type === 'INGRESO') liquido += t.amount;
          if (t.type === 'RETIRO') liquido -= t.amount;
          if (t.type === 'COMPRA') liquido -= t.amount;
          if (t.type === 'VENTA') liquido += t.amount;
        });
        // Valor de activos a la fecha (puede ser 0)
        let valorActivos = 0;
        try {
          valorActivos = await getAssetsValueAtDate(assets, transactions, fechaStr, true);
        } catch (e) {
          console.error('[DEBUG] Error en getAssetsValueAtDate:', e);
          valorActivos = 0;
        }
        patrimonio.push({ x: fecha, y: liquido + valorActivos });
      }
      console.log('[DEBUG] patrimonioSeries calculado:', patrimonio);
      setPatrimonioSeries(patrimonio);
    }
    if (assets.length && transactions.length) calcularPatrimonio();
  }, [assets, transactions]);

  // Calcular detalles de activos para cada fecha de patrimonioSeries
  useEffect(() => {
    async function calcularDetalles() {
      const detalles: { [fecha: string]: { symbol: string; type: string | undefined; units: number; price: number | null; valor: number }[] } = {};
      for (const p of patrimonioSeriesRef.current) {
        const fechaStr = p.x.toISOString().slice(0, 10);
        detalles[fechaStr] = await getActivosDetallePorFecha(assets, transactions, fechaStr, true);
      }
      setActivosDetallePorFecha(detalles);
    }
    if (assets.length && transactions.length && patrimonioSeries.length) calcularDetalles();
  }, [assets, transactions, patrimonioSeries]);

  function calcularSinInvertirSeriesDiario(transactions: Transaction[]): { x: Date, y: number }[] {
    if (transactions.length === 0) return [];
    const primerIngreso = transactions.reduce((min, t) => {
      const d = new Date(t.date);
      return (!min || d < min) ? d : min;
    }, null as Date | null);
    const hoy = new Date();
    if (!primerIngreso) return [];
    const fechas = getDateRange(primerIngreso, hoy);
    let sinInvertir = 0;
    const serie: { x: Date, y: number }[] = [];
    for (const fecha of fechas) {
      const fechaStr = fecha.toISOString().slice(0, 10);
      transactions.forEach(t => {
        if (new Date(t.date).toISOString().slice(0, 10) === fechaStr) {
          if (t.type === 'INGRESO') sinInvertir += t.amount;
          if (t.type === 'RETIRO') sinInvertir -= t.amount;
        }
      });
      serie.push({ x: fecha, y: sinInvertir });
    }
    return serie;
  }

  const sinInvertirSeries = calcularSinInvertirSeriesDiario(transactions);

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" mt={2}>Cargando datos del dashboard...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography color="error">{error}</Typography>
        <Typography variant="body2" color="text.secondary" mt={2}>Debug: assetsBase: {JSON.stringify(assetsBase)}<br/>assets: {JSON.stringify(assets)}<br/>transactions: {JSON.stringify(transactions)}</Typography>
      </Box>
    );
  }

  if (!loading && assetsBase.length > 0 && assets.length === 0) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" mt={2}>Actualizando precios de los activos...</Typography>
      </Box>
    );
  }

  if (!loading && !error && (assets.length === 0 || transactions.length === 0 || patrimonioSeries.length === 0)) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography color="warning.main">No hay datos suficientes para mostrar el dashboard.</Typography>
        <Typography variant="body2" color="text.secondary" mt={2}>
          Debug:<br/>
          assetsBase: {JSON.stringify(assetsBase)}<br/>
          assets: {JSON.stringify(assets)}<br/>
          transactions: {JSON.stringify(transactions)}<br/>
          patrimonioSeries: {JSON.stringify(patrimonioSeries)}
        </Typography>
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
          Evolución real del patrimonio (USD) vs Dinero sin invertir
        </Typography>
        <LineChart
          xAxis={[
            {
              scaleType: 'time',
              data: patrimonioSeries.map(p => p.x),
              label: 'Fecha',
              valueFormatter: (date) => date.toLocaleDateString(),
            },
          ]}
          series={[
            { data: patrimonioSeries.map(p => p.y), label: 'Patrimonio Real', color: '#1976d2' },
            { data: sinInvertirSeries.map(p => p.y), label: 'Sin Invertir', color: '#e57373' },
          ]}
          height={isMobile ? 200 : 300}
          width={isMobile ? 320 : undefined}
        />
      </Paper>

      {/* Tabla de debug: Dinero sin invertir y Patrimonio real por fecha */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Debug: Evolución de Dinero sin Invertir y Patrimonio Real
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Dinero sin invertir (USD)</TableCell>
                <TableCell>Patrimonio real (USD)</TableCell>
                <TableCell>Detalle de activos</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {patrimonioSeries.map((p, idx) => {
                const fechaStr = p.x.toISOString().slice(0, 10);
                const detalles = activosDetallePorFecha[fechaStr] || [];
                return (
                  <TableRow key={p.x.toISOString()}>
                    <TableCell>{p.x.toLocaleDateString()}</TableCell>
                    <TableCell>
                      {sinInvertirSeries[idx] ? sinInvertirSeries[idx].y.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                    </TableCell>
                    <TableCell>
                      {p.y.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {detalles.length === 0 ? '-' : (
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {detalles.map((d) => (
                            <li key={d.symbol + d.type}>
                              {d.symbol} ({d.type}): {d.units} u. x ${d.price?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? 'N/A'} = <b>${d.valor.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
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
import { Box, Paper, Typography, CircularProgress, useTheme, useMediaQuery, Container } from '@mui/material';
import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { api } from '../services/api';
import type { Asset, Transaction } from '../types';

// Registrar los componentes necesarios de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [chartData, setChartData] = useState<any>(null);

  // Función para obtener precio histórico de un asset
  const getAssetHistoricalPrice = async (assetId: string, date: string) => {
    try {
      const response = await api.getHistoricalPrice(assetId, date, 'USD');
      if (response && response.price) {
        return response.price;
      }
      return null;
    } catch (error) {
      console.error(`[DEBUG] Error obteniendo precio histórico para ${assetId} en ${date}:`, error);
      return null;
    }
  };

  // Función para normalizar fechas de Railway (UTC) a fecha local
  const normalizeRailwayDate = (dateInput: string | Date): string => {
    // Convertir a string si es Date
    const dateString = typeof dateInput === 'string' ? dateInput : dateInput.toISOString();
    
    // Railway almacena fechas en UTC, pero cuando creamos new Date() 
    // JavaScript las interpreta como si fueran locales
    // Necesitamos tratarlas como UTC y convertirlas a local
    
    // Si la fecha ya tiene 'T' y 'Z', ya está en formato ISO
    if (dateString.includes('T') && dateString.includes('Z')) {
      const utcDate = new Date(dateString);
      return utcDate.toISOString().split('T')[0];
    }
    
    // Si es una fecha de Railway en formato "YYYY-MM-DD HH:mm:ss"
    if (dateString.includes(' ') && !dateString.includes('T')) {
      // Crear fecha UTC y convertir a local
      const [datePart, timePart] = dateString.split(' ');
      const utcDate = new Date(`${datePart}T${timePart}Z`);
      return utcDate.toISOString().split('T')[0];
    }
    
    // Para otros formatos, intentar parsear normalmente
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  // Función para generar datos del gráfico desde la primera transacción hasta hoy
  const generateChartData = async (transactions: Transaction[], assets: Asset[]) => {
    if (transactions.length === 0) return null;

    // Obtener la fecha de la primera transacción
    const firstTransactionDate = new Date(Math.min(...transactions.map(t => new Date(t.date).getTime())));
    
    // Obtener la fecha de hoy
    const today = new Date();
    
    // Crear array de fechas usando componentes locales para evitar problemas de timezone
    const dates: string[] = [];
    const cashValueData: number[] = [];
    const investedMoneyData: number[] = [];
    const currentDate = new Date(firstTransactionDate);
    
    // Función helper para formatear fecha como YYYY-MM-DD usando componentes locales
    const formatDateLocal = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // Función helper para comparar fechas usando componentes locales
    const isSameOrBefore = (date1: Date, date2: Date) => {
      const year1 = date1.getFullYear();
      const month1 = date1.getMonth();
      const day1 = date1.getDate();
      
      const year2 = date2.getFullYear();
      const month2 = date2.getMonth();
      const day2 = date2.getDate();
      
      if (year1 < year2) return true;
      if (year1 > year2) return false;
      if (month1 < month2) return true;
      if (month1 > month2) return false;
      return day1 <= day2;
    };

    // Función para calcular unidades poseídas de cada asset hasta una fecha específica
    const calculateAssetUnitsAtDate = (assetId: string, targetDate: string) => {
      let totalUnits = 0;
      
      transactions.forEach((transaction: Transaction) => {
        // Normalizar la fecha de Railway a fecha local
        const transactionDateNormalized = normalizeRailwayDate(transaction.date);
        
        console.log(`[DEBUG] Comparando fechas para asset ${assetId}:`, {
          transactionDate: transaction.date,
          transactionDateNormalized,
          targetDate,
          isIncluded: transactionDateNormalized <= targetDate,
          transactionType: transaction.type,
          assetName: transaction.assetName,
          units: transaction.units
        });
        
        if (transactionDateNormalized <= targetDate) {
          // Buscar si la transacción es para este asset específico
          const asset = assets.find(a => a.id === assetId);
          if (asset && transaction.assetName === asset.name) {
            if (transaction.type === 'COMPRA' && transaction.units) {
              totalUnits += transaction.units;
            } else if (transaction.type === 'VENTA' && transaction.units) {
              totalUnits -= transaction.units;
            }
          }
        }
      });
      
      console.log(`[DEBUG] Unidades para asset ${assetId} en ${targetDate}: ${totalUnits}`);
      return totalUnits;
    };

    // Función para calcular el valor real de las inversiones en una fecha específica
    const calculateInvestedValueAtDate = async (targetDate: string) => {
      let totalInvestedValue = 0;
      
      for (const asset of assets) {
        const unitsAtDate = calculateAssetUnitsAtDate(asset.id, targetDate);
        
        if (unitsAtDate > 0) {
          // Obtener precio histórico del asset para esta fecha
          const historicalPrice = await getAssetHistoricalPrice(asset.id, targetDate);
          
          if (historicalPrice) {
            totalInvestedValue += unitsAtDate * historicalPrice;
          } else {
            // Si no hay precio histórico, usar el precio promedio de compra
            totalInvestedValue += unitsAtDate * asset.averagePurchasePrice;
          }
        }
      }
      
      return totalInvestedValue;
    };

    // Función para calcular el valor del dinero si no se hubiese invertido (efectivo)
    const calculateCashValueAtDate = (targetDate: string) => {
      let cashValue = 0;
      
      transactions.forEach((transaction: Transaction) => {
        // Normalizar la fecha de Railway a fecha local
        const transactionDateNormalized = normalizeRailwayDate(transaction.date);
        
        console.log(`[DEBUG] Comparando fechas:`, {
          transactionDate: transaction.date,
          transactionDateNormalized,
          targetDate,
          isIncluded: transactionDateNormalized <= targetDate,
          transactionType: transaction.type,
          amount: transaction.amount
        });
        
        if (transactionDateNormalized <= targetDate) {
          if (transaction.type === 'INGRESO') {
            cashValue += transaction.amount;
          } else if (transaction.type === 'RETIRO') {
            cashValue -= transaction.amount;
          }
          // No consideramos COMPRA ni VENTA para el valor en efectivo
          // ya que queremos ver qué pasaría si el dinero se hubiese quedado en efectivo
        }
      });
      
      console.log(`[DEBUG] Valor en efectivo para ${targetDate}: ${cashValue}`);
      return cashValue;
    };
    
    while (isSameOrBefore(currentDate, today)) {
      const dateString = formatDateLocal(currentDate);
      dates.push(dateString);
      
      console.log(`[DEBUG] Generando datos para fecha: ${dateString}`);
      
      // Calcular valor del dinero si no se hubiese invertido
      const cashValue = calculateCashValueAtDate(dateString);
      cashValueData.push(cashValue);
      
      // Calcular valor real de las inversiones en esta fecha
      const investedValue = await calculateInvestedValueAtDate(dateString);
      investedMoneyData.push(investedValue);
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return {
      labels: dates.map(date => {
        const dateObj = new Date(date + 'T00:00:00');
        return dateObj.toLocaleDateString('es-AR', { 
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          month: '2-digit',
          day: '2-digit'
        });
      }),
      datasets: [
        {
          label: 'Valor en Efectivo (Sin Invertir)',
          data: cashValueData,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          tension: 0.1,
          borderWidth: 2,
          pointRadius: isMobile ? 2 : 4,
          pointHoverRadius: isMobile ? 4 : 6,
        },
        {
          label: 'Valor Real de Inversiones',
          data: investedMoneyData,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          tension: 0.1,
          borderWidth: 2,
          pointRadius: isMobile ? 2 : 4,
          pointHoverRadius: isMobile ? 4 : 6,
        },
      ],
    };
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('[DEBUG] Cargando datos del dashboard...');
        
        const [assetsData, transactionsData] = await Promise.all([
          api.getAssets(),
          api.getTransactions(),
        ]);
        
        console.log('[DEBUG] Assets cargados:', assetsData);
        console.log('[DEBUG] Transactions cargados:', transactionsData);
        
        // Calcular dinero líquido
        let liquidMoney = 0;
        transactionsData.forEach((transaction: Transaction) => {
          if (transaction.type === 'INGRESO') {
            liquidMoney += transaction.amount;
          } else if (transaction.type === 'RETIRO') {
            liquidMoney -= transaction.amount;
          } else if (transaction.type === 'COMPRA') {
            liquidMoney -= transaction.amount;
          } else if (transaction.type === 'VENTA') {
            liquidMoney += transaction.amount;
          }
        });
        
        console.log('[DEBUG] Dinero líquido calculado:', liquidMoney);
        
        // Calcular valor de activos
        let assetsValue = 0;
        assetsData.forEach((asset: Asset) => {
          if (asset.currentPrice && asset.totalUnits) {
            assetsValue += asset.currentPrice * asset.totalUnits;
          }
        });
        
        console.log('[DEBUG] Valor de activos calculado:', assetsValue);
        
        // Valor total del portfolio
        const totalValue = liquidMoney + assetsValue;
        console.log('[DEBUG] Valor total del portfolio:', totalValue);
        
        // Generar datos del gráfico
        const chartDataGenerated = await generateChartData(transactionsData, assetsData);
        console.log('[DEBUG] Datos del gráfico generados:', chartDataGenerated);
        
        setTotalPortfolioValue(totalValue);
        setTransactions(transactionsData);
        setAssets(assetsData);
        setChartData(chartDataGenerated);
        setError(null);
      } catch (err) {
        console.error('[DEBUG] Error cargando datos:', err);
        setError('Error al cargar los datos: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: isMobile ? 10 : 20,
          font: {
            size: isMobile ? 12 : 14,
          },
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: 'Comparación: Inversiones vs Efectivo',
        font: {
          size: isMobile ? 16 : 20,
          weight: 'bold' as const,
        },
        padding: {
          top: isMobile ? 10 : 20,
          bottom: isMobile ? 10 : 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        titleFont: {
          size: isMobile ? 12 : 14,
        },
        bodyFont: {
          size: isMobile ? 11 : 13,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: isMobile ? 10 : 12,
          },
          maxRotation: isMobile ? 45 : 0,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: isMobile ? 10 : 12,
          },
          callback: function(value: any) {
            return '$' + value.toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            });
          }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    elements: {
      point: {
        hoverBorderWidth: 3,
      },
    },
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={isMobile ? 40 : 60} />
          <Typography variant="body1" color="text.secondary" mt={3} textAlign="center">
            Cargando datos del dashboard...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="60vh">
          <Typography color="error" variant="h5" gutterBottom textAlign="center">
            Error
          </Typography>
          <Typography color="text.secondary" textAlign="center" maxWidth="600px">
            {error}
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Título del Dashboard */}
        <Box>
          <Typography 
            variant={isMobile ? "h4" : "h3"} 
            gutterBottom 
            sx={{ 
              fontWeight: 'bold',
              textAlign: isMobile ? 'center' : 'left',
              mb: isMobile ? 2 : 3
            }}
          >
            Dashboard
          </Typography>
        </Box>

        {/* Tarjetas superiores */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: 3
        }}>
          {/* Tarjeta del valor total del portfolio */}
          <Box sx={{ 
            flex: isMobile ? 'none' : '0 0 33.333%',
            minWidth: isMobile ? 'auto' : '300px'
          }}>
            <Paper
              sx={{
                p: isMobile ? 2 : 3,
                textAlign: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <Typography variant={isMobile ? "h6" : "h5"} gutterBottom sx={{ fontWeight: 600 }}>
                Valor Total de tu Cartera
              </Typography>
              <Typography 
                variant={isMobile ? "h4" : "h3"} 
                component="div" 
                sx={{ 
                  fontWeight: 'bold',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}
              >
                USD {totalPortfolioValue.toLocaleString('en-US', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </Typography>
            </Paper>
          </Box>

          {/* Información adicional */}
          <Box sx={{ 
            flex: isMobile ? 'none' : '1',
            minWidth: isMobile ? 'auto' : '300px'
          }}>
            <Paper
              sx={{
                p: isMobile ? 2 : 3,
                height: '100%',
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <Typography variant={isMobile ? "h6" : "h5"} gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Resumen
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total de Transacciones
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {transactions.length}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Activos en Cartera
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {assets.length}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>
        </Box>

        {/* Gráfico de evolución del patrimonio */}
        <Box>
          <Paper 
            sx={{ 
              p: isMobile ? 2 : 3, 
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            }}
          >
            <Box sx={{ 
              height: isMobile ? '50vh' : isTablet ? '60vh' : '70vh',
              minHeight: '400px',
              position: 'relative'
            }}>
              {chartData && <Line options={chartOptions} data={chartData} />}
            </Box>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
} 
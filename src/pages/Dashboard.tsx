import { Box, Paper, Typography, CircularProgress, TableContainer, Table, TableHead, TableBody, TableRow, TableCell } from '@mui/material';
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Asset, Transaction } from '../types';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dailyData, setDailyData] = useState<Array<{date: string, asset: string, portfolioValue: number}>>([]);
  const [ethereumPrices, setEthereumPrices] = useState<{[date: string]: number}>({});

  // Función para obtener precio histórico de Ethereum
  const getEthereumHistoricalPrice = async (date: string) => {
    try {
      // Por ahora usamos datos mock para evitar problemas de CORS
      // En el futuro esto se moverá al backend
      const basePrice = 3000; // Precio base de Ethereum
      const dateObj = new Date(date);
      const daysSince2020 = Math.floor((dateObj.getTime() - new Date('2020-01-01').getTime()) / (1000 * 60 * 60 * 24));
      
      // Simular variación de precio basada en la fecha
      const variation = Math.sin(daysSince2020 * 0.01) * 500; // Variación sinusoidal
      const randomVariation = (Math.random() - 0.5) * 200; // Variación aleatoria
      
      const price = Math.max(100, basePrice + variation + randomVariation);
      
      console.log(`[DEBUG] Precio simulado de Ethereum para ${date}: $${price.toFixed(2)}`);
      return price;
      
      /* Código original comentado para evitar CORS
      // Convertir fecha a timestamp (Unix timestamp en segundos)
      const timestamp = Math.floor(new Date(date).getTime() / 1000);
      
      // Usar CoinGecko API para obtener precio histórico
      // Cambiamos a usar el endpoint de precio histórico por fecha específica
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/ethereum/history?date=${date}&localization=false`
      );
      
      if (!response.ok) {
        console.warn(`[DEBUG] No se pudo obtener precio de Ethereum para ${date}: ${response.status}`);
        return 0;
      }
      
      const data = await response.json();
      
      if (data.market_data && data.market_data.current_price && data.market_data.current_price.usd) {
        const price = data.market_data.current_price.usd;
        console.log(`[DEBUG] Precio de Ethereum para ${date}: $${price}`);
        return price;
      }
      
      console.warn(`[DEBUG] No se encontró precio de Ethereum para ${date}`);
      return 0;
      */
    } catch (error) {
      console.error(`[DEBUG] Error obteniendo precio de Ethereum para ${date}:`, error);
      return 0;
    }
  };

  // Función para obtener todos los precios históricos de Ethereum
  const getEthereumPricesForDates = async (dates: string[]) => {
    const prices: {[date: string]: number} = {};
    
    for (const date of dates) {
      const price = await getEthereumHistoricalPrice(date);
      prices[date] = price;
      
      // Pequeña pausa para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return prices;
  };

  // Función para generar array de fechas desde la primera transacción hasta hoy
  const generateDailyData = (transactions: Transaction[]) => {
    if (transactions.length === 0) return [];

    // Obtener la fecha de la primera transacción
    const firstTransactionDate = new Date(Math.min(...transactions.map(t => new Date(t.date).getTime())));
    
    // Obtener la fecha de hoy en la zona horaria local
    const today = new Date();
    
    // Crear array de fechas
    const dates: Array<{date: string, asset: string, portfolioValue: number}> = [];
    const currentDate = new Date(firstTransactionDate);
    
    while (currentDate <= today) {
      const dateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Buscar si hay transacciones en esta fecha
      const transactionOnThisDate = transactions.find(t => 
        new Date(t.date).toISOString().split('T')[0] === dateString
      );
      
      // Calcular patrimonio hasta esta fecha
      let liquidMoney = 0;
      let investedMoney = 0;
      
      transactions.forEach((transaction: Transaction) => {
        const transactionDate = new Date(transaction.date).toISOString().split('T')[0];
        if (transactionDate <= dateString) {
          if (transaction.type === 'INGRESO') {
            liquidMoney += transaction.amount;
          } else if (transaction.type === 'RETIRO') {
            liquidMoney -= transaction.amount;
          } else if (transaction.type === 'COMPRA') {
            liquidMoney -= transaction.amount;
            investedMoney += transaction.amount;
          } else if (transaction.type === 'VENTA') {
            liquidMoney += transaction.amount;
            investedMoney -= transaction.amount;
          }
        }
      });
      
      const portfolioValue = liquidMoney + investedMoney;
      
      dates.push({
        date: dateString,
        asset: transactionOnThisDate ? transactionOnThisDate.assetName || '-' : '-',
        portfolioValue: portfolioValue
      });
      
      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
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
        
        // Generar datos diarios
        const dailyDataArray = generateDailyData(transactionsData);
        console.log('[DEBUG] Datos diarios generados:', dailyDataArray);
        
        // Obtener precios históricos de Ethereum
        const dates = dailyDataArray.map(day => day.date);
        const ethereumPricesData = await getEthereumPricesForDates(dates);
        console.log('[DEBUG] Precios de Ethereum obtenidos:', ethereumPricesData);
        
        setTotalPortfolioValue(totalValue);
        setTransactions(transactionsData);
        setDailyData(dailyDataArray);
        setEthereumPrices(ethereumPricesData);
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

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" mt={2}>
          Cargando datos del dashboard...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography color="error" variant="h6" gutterBottom>
          Error
        </Typography>
        <Typography color="text.secondary" textAlign="center">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* Tarjeta del valor total del portfolio */}
      <Paper
        sx={{
          p: 3,
          textAlign: 'center',
          bgcolor: 'primary.light',
          color: 'white',
          mb: 3,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Valor Total de tu Cartera
        </Typography>
        <Typography variant="h3" component="div" sx={{ fontWeight: 'bold' }}>
          USD {totalPortfolioValue.toLocaleString('en-US', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          })}
        </Typography>
      </Paper>

      {/* Tabla de transacciones */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Evolución del Patrimonio
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Dinero Líquido (USD)</TableCell>
                <TableCell>Dinero Invertido (USD)</TableCell>
                <TableCell>Patrimonio Total (USD)</TableCell>
                <TableCell>Precio Ethereum (USD)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dailyData.map((day, index) => {
                // Recalcular para mostrar los valores desglosados
                let liquidMoney = 0;
                let investedMoney = 0;
                
                transactions.forEach((transaction: Transaction) => {
                  const transactionDate = new Date(transaction.date).toISOString().split('T')[0];
                  if (transactionDate <= day.date) {
                    if (transaction.type === 'INGRESO') {
                      liquidMoney += transaction.amount;
                    } else if (transaction.type === 'RETIRO') {
                      liquidMoney -= transaction.amount;
                    } else if (transaction.type === 'COMPRA') {
                      liquidMoney -= transaction.amount;
                      investedMoney += transaction.amount;
                    } else if (transaction.type === 'VENTA') {
                      liquidMoney += transaction.amount;
                      investedMoney -= transaction.amount;
                    }
                  }
                });
                
                const portfolioValue = liquidMoney + investedMoney;
                const ethereumPrice = ethereumPrices[day.date] || 0;
                
                return (
                  <TableRow key={index}>
                    <TableCell>
                      {new Date(day.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {liquidMoney.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </TableCell>
                    <TableCell>
                      {investedMoney.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </TableCell>
                    <TableCell>
                      {portfolioValue.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </TableCell>
                    <TableCell>
                      {ethereumPrice > 0 ? ethereumPrice.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      }) : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </div>
  );
} 
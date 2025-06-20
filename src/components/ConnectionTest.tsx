import { useState } from 'react';
import { Button, Box, Typography, Paper } from '@mui/material';
import { api } from '../services/api';

export default function ConnectionTest() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async (endpoint: string) => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      let data;
      switch (endpoint) {
        case 'health':
          data = await api.checkHealth();
          break;
        case 'transactions':
          data = await api.getTransactions();
          break;
        case 'assets':
          data = await api.getAssets();
          break;
        case 'test-transactions':
          const response = await fetch('https://fine-production.up.railway.app/api/test-transactions');
          data = await response.json();
          break;
        default:
          throw new Error('Endpoint no válido');
      }
      
      setResults({
        endpoint,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error(`Error testing ${endpoint}:`, err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Test de Conexión al Backend
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Button 
          variant="contained" 
          onClick={() => testConnection('health')}
          disabled={loading}
        >
          Health Check
        </Button>
        <Button 
          variant="contained" 
          onClick={() => testConnection('transactions')}
          disabled={loading}
        >
          Transacciones
        </Button>
        <Button 
          variant="contained" 
          onClick={() => testConnection('assets')}
          disabled={loading}
        >
          Assets
        </Button>
        <Button 
          variant="outlined" 
          color="warning"
          onClick={() => testConnection('test-transactions')}
          disabled={loading}
        >
          Test DB Transacciones
        </Button>
      </Box>

      {loading && (
        <Typography>Cargando...</Typography>
      )}

      {error && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.light' }}>
          <Typography color="error">
            <strong>Error:</strong> {error}
          </Typography>
        </Paper>
      )}

      {results && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Resultado: {results.endpoint}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Timestamp: {results.timestamp}
          </Typography>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '10px', 
            borderRadius: '4px',
            overflow: 'auto',
            maxHeight: '400px'
          }}>
            {JSON.stringify(results.data, null, 2)}
          </pre>
        </Paper>
      )}
    </Box>
  );
} 
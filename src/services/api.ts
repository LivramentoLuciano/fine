import type { Transaction, Asset } from '../types';

// Usar Railway tanto en producción como en desarrollo para pruebas
const API_URL = 'https://fine-production.up.railway.app/api';

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
};

export const api = {
  async createTransaction(data: Omit<Transaction, 'id'>) {
    try {
      const response = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('API Error:', error);
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('No se pudo conectar con el servidor. Por favor, verifica que el servidor backend esté corriendo.');
        }
        throw error;
      }
      throw new Error('Error desconocido al crear la transacción');
    }
  },

  async getTransactions() {
    try {
      const response = await fetch(`${API_URL}/transactions`);
      return await handleResponse(response);
    } catch (error) {
      console.error('API Error:', error);
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('No se pudo conectar con el servidor. Por favor, verifica que el servidor backend esté corriendo.');
        }
        throw error;
      }
      throw new Error('Error desconocido al obtener las transacciones');
    }
  },

  async getAssets() {
    try {
      const response = await fetch(`${API_URL}/assets`);
      return await handleResponse(response);
    } catch (error) {
      console.error('API Error:', error);
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('No se pudo conectar con el servidor. Por favor, verifica que el servidor backend esté corriendo.');
        }
        throw error;
      }
      throw new Error('Error desconocido al obtener los activos');
    }
  },

  async createAsset(data: Partial<Asset>) {
    try {
      const response = await fetch(`${API_URL}/assets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('API Error:', error);
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('No se pudo conectar con el servidor. Por favor, verifica que el servidor backend esté corriendo.');
        }
        throw error;
      }
      throw new Error('Error desconocido al crear el activo');
    }
  },

  async updateAsset(id: string, data: Partial<Asset>) {
    try {
      const response = await fetch(`${API_URL}/assets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('API Error:', error);
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('No se pudo conectar con el servidor. Por favor, verifica que el servidor backend esté corriendo.');
        }
        throw error;
      }
      throw new Error('Error desconocido al actualizar el activo');
    }
  },

  async checkHealth() {
    try {
      const response = await fetch(`${API_URL}/health`);
      return await handleResponse(response);
    } catch (error) {
      console.error('Health check error:', error);
      throw new Error('El servidor no está respondiendo');
    }
  },

  async updateTransaction(id: string, data: Partial<Transaction>) {
    try {
      const response = await fetch(`${API_URL}/transactions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('API Error:', error);
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('No se pudo conectar con el servidor. Por favor, verifica que el servidor backend esté corriendo.');
        }
        throw error;
      }
      throw new Error('Error desconocido al actualizar la transacción');
    }
  },

  async deleteTransaction(id: string) {
    try {
      const response = await fetch(`${API_URL}/transactions/${id}`, {
        method: 'DELETE',
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('API Error:', error);
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('No se pudo conectar con el servidor. Por favor, verifica que el servidor backend esté corriendo.');
        }
        throw error;
      }
      throw new Error('Error desconocido al eliminar la transacción');
    }
  },

  // Métodos genéricos para llamadas HTTP
  async get(endpoint: string) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`);
      return await handleResponse(response);
    } catch (error) {
      console.error('API Error:', error);
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('No se pudo conectar con el servidor. Por favor, verifica que el servidor backend esté corriendo.');
        }
        throw error;
      }
      throw new Error('Error desconocido en la petición GET');
    }
  },

  async post(endpoint: string, data?: any) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('API Error:', error);
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('No se pudo conectar con el servidor. Por favor, verifica que el servidor backend esté corriendo.');
        }
        throw error;
      }
      throw new Error('Error desconocido en la petición POST');
    }
  },

  async delete(endpoint: string) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
      });
      return await handleResponse(response);
    } catch (error) {
      console.error('API Error:', error);
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('No se pudo conectar con el servidor. Por favor, verifica que el servidor backend esté corriendo.');
        }
        throw error;
      }
      throw new Error('Error desconocido en la petición DELETE');
    }
  },

  // Métodos específicos para precios históricos
  async getHistoricalPrice(assetId: string, date: string, currency: string = 'USD') {
    return this.get(`/historical-prices/${assetId}/${date}?currency=${currency}`);
  },

  async getHistoricalPrices(assetId: string, startDate: string, endDate: string) {
    return this.get(`/historical-prices/${assetId}/range?startDate=${startDate}&endDate=${endDate}`);
  },

  async getLatestPrice(assetId: string) {
    return this.get(`/historical-prices/${assetId}/latest`);
  },

  async createHistoricalPrice(data: {
    assetId: string;
    date: string;
    price: number;
    currency: string;
    source: string;
  }) {
    return this.post('/historical-prices', data);
  },

  async deleteHistoricalPrice(id: string) {
    return this.delete(`/historical-prices/${id}`);
  },

  async cleanupOldPrices() {
    return this.delete('/historical-prices/cleanup/old');
  },

  async preloadHistoricalPrices(assetId: string, firstTransactionDate: string) {
    return this.post(`/historical-prices/${assetId}/preload`, {
      firstTransactionDate
    });
  },
}; 
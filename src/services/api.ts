import type { Transaction, Asset } from '../types';

const API_URL = 'http://localhost:3000/api';

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
      const response = await fetch(`${API_URL.replace('/api', '')}/health`);
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
}; 
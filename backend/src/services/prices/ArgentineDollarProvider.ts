import axios from 'axios';
import type { PriceProvider } from './PriceService';

interface DolarAPIResponse {
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  agencia: string;
  distante: number;
  variacion: number;
  ventaCero: boolean;
  decimales: number;
}

export class ArgentineDollarProvider implements PriceProvider {
  private baseUrl = 'https://dolarapi.com/v1/dolares';

  async getPrice(symbol: string): Promise<number> {
    // Este proveedor solo maneja la conversión de USD a ARS
    if (symbol !== 'USD') {
      throw new Error('ArgentineDollarProvider solo soporta conversiones de USD a ARS');
    }

    try {
      // Obtener todas las cotizaciones
      const response = await axios.get<DolarAPIResponse[]>(this.baseUrl);
      const rates = response.data;

      // Buscar primero el dólar blue
      const blueRate = rates.find(rate => rate.casa.toLowerCase() === 'blue');
      if (blueRate) {
        return blueRate.venta;
      }

      // Si no hay blue, buscar MEP
      const mepRate = rates.find(rate => rate.casa.toLowerCase() === 'bolsa');
      if (mepRate) {
        return mepRate.venta;
      }

      // Si no hay MEP, usar oficial
      const oficialRate = rates.find(rate => rate.casa.toLowerCase() === 'oficial');
      if (oficialRate) {
        return oficialRate.venta;
      }

      throw new Error('No se pudo obtener ninguna cotización del dólar');
    } catch (error) {
      console.error('Error fetching Argentine dollar rate:', error);
      throw new Error('Failed to fetch Argentine dollar rate');
    }
  }
} 
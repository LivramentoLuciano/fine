import type { PriceService, AssetType, Currency } from '../../types';

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

export class ArgentineDollarProvider implements PriceService {
  private baseUrl = 'https://dolarapi.com/v1/dolares';

  async getPrice(_symbol: string, currency: Currency): Promise<number> {
    if (currency !== 'ARS') {
      throw new Error('ArgentineDollarProvider solo soporta conversiones a ARS');
    }

    try {
      // Obtener todas las cotizaciones
      const response = await fetch(this.baseUrl);
      if (!response.ok) {
        throw new Error('Error al obtener las cotizaciones del dólar');
      }
      const rates: DolarAPIResponse[] = await response.json();

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

  supports(assetType: AssetType): boolean {
    // Este proveedor solo maneja la conversión de USD a ARS
    return true; // Podría ser más específico si se necesita
  }
} 
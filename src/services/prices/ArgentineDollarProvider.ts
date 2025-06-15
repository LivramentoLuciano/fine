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

export class ArgentineDollarProvider {
  private baseUrl = 'https://dolarapi.com/v1/dolares';

  async getPrice(symbol: string): Promise<number> {
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
} 
import axios from 'axios';

export class PriceService {
  private readonly API_URL = 'https://api.coingecko.com/api/v3';

  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      // Convertir el símbolo a minúsculas para la API de CoinGecko
      const coinId = symbol.toLowerCase();
      const response = await axios.get(`${this.API_URL}/simple/price`, {
        params: {
          ids: coinId,
          vs_currencies: 'usd'
        }
      });

      if (!response.data[coinId]?.usd) {
        throw new Error(`No se pudo obtener el precio para ${symbol}`);
      }

      return response.data[coinId].usd;
    } catch (error) {
      console.error(`Error al obtener el precio de ${symbol}:`, error);
      throw new Error(`No se pudo obtener el precio actual de ${symbol}`);
    }
  }

  async updateAllAssetPrices(assets: Array<{ id: string; symbol: string }>): Promise<Map<string, number>> {
    const prices = new Map<string, number>();
    
    for (const asset of assets) {
      try {
        const price = await this.getCurrentPrice(asset.symbol);
        prices.set(asset.id, price);
      } catch (error) {
        console.error(`Error al actualizar el precio de ${asset.symbol}:`, error);
      }
    }

    return prices;
  }
} 
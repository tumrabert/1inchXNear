// Price service for fetching real-time ETH and NEAR prices
export interface TokenPrice {
  usd: number
  lastUpdated: number
}

export interface ExchangeRate {
  ethToNear: number
  nearToEth: number
  ethUsd: number
  nearUsd: number
  lastUpdated: number
}

class PriceService {
  private cache: Map<string, TokenPrice> = new Map()
  private readonly CACHE_DURATION = 30000 // 30 seconds
  private readonly API_ENDPOINTS = {
    coingecko: 'https://api.coingecko.com/api/v3/simple/price',
    backup: 'https://api.coinbase.com/v2/exchange-rates'
  }

  async getTokenPrice(tokenId: string): Promise<TokenPrice | null> {
    const cached = this.cache.get(tokenId)
    const now = Date.now()

    // Return cached price if still valid
    if (cached && (now - cached.lastUpdated) < this.CACHE_DURATION) {
      return cached
    }

    try {
      // Try CoinGecko first
      const response = await fetch(
        `${this.API_ENDPOINTS.coingecko}?ids=${tokenId}&vs_currencies=usd&include_last_updated_at=true`
      )
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      
      if (data[tokenId]?.usd) {
        const price: TokenPrice = {
          usd: data[tokenId].usd,
          lastUpdated: now
        }
        
        this.cache.set(tokenId, price)
        return price
      }
      
      throw new Error('Price not found in response')
    } catch (error) {
      console.warn(`Failed to fetch ${tokenId} price from CoinGecko:`, error)
      
      // Try backup source or return cached data if available
      if (cached) {
        console.log(`Using cached price for ${tokenId}`)
        return cached
      }
      
      // Return fallback prices for development
      return this.getFallbackPrice(tokenId)
    }
  }

  private getFallbackPrice(tokenId: string): TokenPrice {
    const fallbackPrices: Record<string, number> = {
      'ethereum': 2500, // Approximate ETH price
      'near': 4.5       // Approximate NEAR price
    }
    
    return {
      usd: fallbackPrices[tokenId] || 1,
      lastUpdated: Date.now()
    }
  }

  async getExchangeRate(): Promise<ExchangeRate> {
    try {
      const [ethPrice, nearPrice] = await Promise.all([
        this.getTokenPrice('ethereum'),
        this.getTokenPrice('near')
      ])

      if (!ethPrice || !nearPrice) {
        throw new Error('Failed to fetch token prices')
      }

      const ethToNear = ethPrice.usd / nearPrice.usd
      const nearToEth = nearPrice.usd / ethPrice.usd

      return {
        ethToNear,
        nearToEth,
        ethUsd: ethPrice.usd,
        nearUsd: nearPrice.usd,
        lastUpdated: Math.min(ethPrice.lastUpdated, nearPrice.lastUpdated)
      }
    } catch (error) {
      console.error('Failed to calculate exchange rate:', error)
      
      // Return fallback exchange rate
      return {
        ethToNear: 555.56, // 2500 / 4.5
        nearToEth: 0.0018, // 4.5 / 2500
        ethUsd: 2500,
        nearUsd: 4.5,
        lastUpdated: Date.now()
      }
    }
  }

  // Calculate equivalent amount for swap
  calculateEquivalentAmount(
    fromAmount: string,
    fromToken: 'ethereum' | 'near',
    toToken: 'ethereum' | 'near',
    exchangeRate: ExchangeRate
  ): string {
    const amount = parseFloat(fromAmount)
    
    if (isNaN(amount) || amount <= 0) {
      return '0'
    }

    if (fromToken === toToken) {
      return fromAmount
    }

    let equivalentAmount: number

    if (fromToken === 'ethereum' && toToken === 'near') {
      equivalentAmount = amount * exchangeRate.ethToNear
    } else if (fromToken === 'near' && toToken === 'ethereum') {
      equivalentAmount = amount * exchangeRate.nearToEth
    } else {
      equivalentAmount = amount
    }

    // Format to reasonable decimal places
    if (equivalentAmount < 0.0001) {
      return equivalentAmount.toExponential(3)
    } else if (equivalentAmount < 1) {
      return equivalentAmount.toFixed(6)
    } else if (equivalentAmount < 1000) {
      return equivalentAmount.toFixed(4)
    } else {
      return equivalentAmount.toFixed(2)
    }
  }

  // Calculate USD value
  calculateUsdValue(amount: string, token: 'ethereum' | 'near', exchangeRate: ExchangeRate): string {
    const tokenAmount = parseFloat(amount)
    if (isNaN(tokenAmount) || tokenAmount <= 0) {
      return '0.00'
    }

    const usdPrice = token === 'ethereum' ? exchangeRate.ethUsd : exchangeRate.nearUsd
    const usdValue = tokenAmount * usdPrice

    return usdValue.toFixed(2)
  }

  // Format price with proper decimal places
  formatPrice(price: number): string {
    if (price < 0.01) {
      return price.toFixed(6)
    } else if (price < 1) {
      return price.toFixed(4)
    } else if (price < 1000) {
      return price.toFixed(2)
    } else {
      return price.toLocaleString('en-US', { maximumFractionDigits: 2 })
    }
  }

  // Check if price data is stale
  isPriceStale(exchangeRate: ExchangeRate): boolean {
    const now = Date.now()
    const age = now - exchangeRate.lastUpdated
    return age > this.CACHE_DURATION * 2 // Consider stale after 1 minute
  }
}

// Singleton instance
export const priceService = new PriceService()

// Utility function to get price change indicator
export function getPriceChangeIndicator(oldPrice: number, newPrice: number): '↑' | '↓' | '→' {
  const threshold = 0.001 // 0.1% threshold
  const change = Math.abs(newPrice - oldPrice) / oldPrice
  
  if (change < threshold) return '→'
  return newPrice > oldPrice ? '↑' : '↓'
}
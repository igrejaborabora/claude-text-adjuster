import { useState, useEffect } from 'react'
import { ShopifyMarket } from '@/lib/supabase'

interface MarketsResponse {
  markets: ShopifyMarket[]
  stats?: {
    totalMarkets: number
    currencies: string[]
    marketsByCurrency: Record<string, ShopifyMarket[]>
  }
}

export function useShopifyMarkets() {
  const [markets, setMarkets] = useState<ShopifyMarket[]>([])
  const [nonEuroMarkets, setNonEuroMarkets] = useState<ShopifyMarket[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)

  const fetchAllMarkets = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/shopify-markets')
      if (!response.ok) throw new Error('Failed to fetch markets')
      const data = await response.json()
      setMarkets(data.markets)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchNonEuroMarkets = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/shopify-markets?action=non-euro')
      if (!response.ok) throw new Error('Failed to fetch non-EUR markets')
      const data: MarketsResponse = await response.json()
      setNonEuroMarkets(data.markets)
      setStats(data.stats)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const syncFromShopify = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/shopify-markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      })
      if (!response.ok) throw new Error('Failed to sync markets')
      const data = await response.json()
      await fetchAllMarkets()
      await fetchNonEuroMarkets()
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllMarkets()
    fetchNonEuroMarkets()
  }, [])

  return {
    markets,
    nonEuroMarkets,
    loading,
    error,
    stats,
    refetch: fetchAllMarkets,
    refetchNonEuro: fetchNonEuroMarkets,
    syncFromShopify,
  }
}

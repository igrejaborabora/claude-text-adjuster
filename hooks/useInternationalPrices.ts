import { useState, useEffect } from 'react'
import { InternationalPrice } from '@/lib/supabase'

export function useInternationalPrices() {
  const [prices, setPrices] = useState<InternationalPrice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)

  const fetchAllPrices = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/international-pricing')
      if (!response.ok) throw new Error('Failed to fetch prices')
      const data = await response.json()
      setPrices(data.pricing)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchPricesByProduct = async (productId: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/international-pricing?action=by-product&productId=${productId}`)
      if (!response.ok) throw new Error('Failed to fetch product prices')
      const data = await response.json()
      return data.pricing
    } catch (err: any) {
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }

  const fetchPricesBySku = async (sku: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/international-pricing?sku=${sku}`)
      if (!response.ok) throw new Error('Failed to fetch SKU prices')
      const data = await response.json()
      return data.pricing
    } catch (err: any) {
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/international-pricing?action=stats')
      if (!response.ok) throw new Error('Failed to fetch stats')
      const data = await response.json()
      setStats(data.stats)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createPrice = async (priceData: Partial<InternationalPrice>) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/international-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', pricingData: priceData }),
      })
      if (!response.ok) throw new Error('Failed to create price')
      const data = await response.json()
      await fetchAllPrices()
      return data.pricing
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updatePrice = async (priceData: Partial<InternationalPrice> & { id: string }) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/international-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', pricingData: priceData }),
      })
      if (!response.ok) throw new Error('Failed to update price')
      const data = await response.json()
      await fetchAllPrices()
      return data.pricing
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const batchUpdatePrices = async (updates: Array<Partial<InternationalPrice> & { id: string }>) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/international-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'batch-update', pricingData: updates }),
      })
      if (!response.ok) throw new Error('Failed to batch update prices')
      const data = await response.json()
      await fetchAllPrices()
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const generatePricesForProduct = async (productId: string, baseAdjustment = 0) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/international-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'generate-prices', 
          pricingData: { productId, baseAdjustment } 
        }),
      })
      if (!response.ok) throw new Error('Failed to generate prices')
      const data = await response.json()
      await fetchAllPrices()
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deletePrice = async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/international-pricing?id=${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete price')
      await fetchAllPrices()
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deletePricesForProduct = async (productId: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/international-pricing?productId=${productId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete product prices')
      await fetchAllPrices()
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllPrices()
    fetchStats()
  }, [])

  return {
    prices,
    loading,
    error,
    stats,
    refetch: fetchAllPrices,
    fetchStats,
    fetchPricesByProduct,
    fetchPricesBySku,
    createPrice,
    updatePrice,
    batchUpdatePrices,
    generatePricesForProduct,
    deletePrice,
    deletePricesForProduct,
  }
}

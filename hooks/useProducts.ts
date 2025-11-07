import { useState, useEffect } from 'react'
import { Product } from '@/lib/supabase'

interface ProductWithPricing extends Product {
  pricing_count?: number
  has_pricing?: boolean
}

export function useProducts() {
  const [products, setProducts] = useState<ProductWithPricing[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = async (withPricing = false) => {
    try {
      setLoading(true)
      setError(null)
      const url = withPricing ? '/api/products?action=with-pricing' : '/api/products'
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch products')
      const data = await response.json()
      setProducts(data.products)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchProduct = async (id: string): Promise<Product | null> => {
    try {
      const response = await fetch(`/api/products?id=${id}`)
      if (!response.ok) throw new Error('Failed to fetch product')
      const data = await response.json()
      return data.product
    } catch (err: any) {
      setError(err.message)
      return null
    }
  }

  const createProduct = async (productData: Partial<Product>) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', productData }),
      })
      if (!response.ok) throw new Error('Failed to create product')
      const data = await response.json()
      await fetchProducts(true)
      return data.product
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateProduct = async (productData: Partial<Product> & { id: string }) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', productData }),
      })
      if (!response.ok) throw new Error('Failed to update product')
      const data = await response.json()
      await fetchProducts(true)
      return data.product
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deleteProduct = async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/products?id=${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete product')
      await fetchProducts(true)
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const syncFromShopify = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync-from-shopify' }),
      })
      if (!response.ok) throw new Error('Failed to sync products')
      const data = await response.json()
      await fetchProducts(true)
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts(true)
  }, [])

  return {
    products,
    loading,
    error,
    refetch: () => fetchProducts(true),
    fetchProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    syncFromShopify,
  }
}

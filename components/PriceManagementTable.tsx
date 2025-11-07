'use client'

import React, { useState, useEffect } from 'react'
import { 
  DollarSign, 
  Edit, 
  Save, 
  X, 
  Plus, 
  RefreshCw, 
  Calculator,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { useProducts } from '@/hooks/useProducts'
import { useInternationalPrices } from '@/hooks/useInternationalPrices'
import { InternationalPrice } from '@/lib/supabase'

interface PriceManagementTableProps {
  selectedProduct?: string | null
  onProductSelect?: (productId: string | null) => void
}

export default function PriceManagementTable({ 
  selectedProduct, 
  onProductSelect 
}: PriceManagementTableProps) {
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [baseAdjustment, setBaseAdjustment] = useState(0)
  
  const { products } = useProducts()
  const { 
    prices, 
    loading, 
    fetchPricesByProduct, 
    updatePrice, 
    batchUpdatePrices, 
    generatePricesForProduct,
    deletePrice 
  } = useInternationalPrices()

  const [productPrices, setProductPrices] = useState<InternationalPrice[]>([])
  const selectedProductData = products.find(p => p.id === selectedProduct)

  useEffect(() => {
    if (selectedProduct) {
      fetchPricesByProduct(selectedProduct).then(setProductPrices)
    } else {
      setProductPrices(prices)
    }
  }, [selectedProduct, prices, fetchPricesByProduct])

  const handleEdit = (priceId: string, price: InternationalPrice) => {
    setEditingPrice(priceId)
    setEditValues({
      price_adjustment: price.price_adjustment,
      final_price: price.final_price,
    })
  }

  const handleSave = async (priceId: string) => {
    try {
      await updatePrice({
        id: priceId,
        price_adjustment: parseFloat(editValues.price_adjustment) || 0,
        final_price: parseFloat(editValues.final_price) || 0,
      })
      setEditingPrice(null)
      setEditValues({})
    } catch (error) {
      console.error('Error updating price:', error)
    }
  }

  const handleCancel = () => {
    setEditingPrice(null)
    setEditValues({})
  }

  const handleGeneratePrices = async () => {
    if (!selectedProduct) return
    try {
      await generatePricesForProduct(selectedProduct, baseAdjustment)
      const updatedPrices = await fetchPricesByProduct(selectedProduct)
      setProductPrices(updatedPrices)
    } catch (error) {
      console.error('Error generating prices:', error)
    }
  }

  const handleBatchUpdate = async () => {
    if (!selectedProduct) return
    try {
      const updates = productPrices.map((price) => ({
        id: price.id,
        price_adjustment: baseAdjustment,
        final_price: price.local_price * (1 + baseAdjustment / 100),
      }))
      await batchUpdatePrices(updates)
      const updatedPrices = await fetchPricesByProduct(selectedProduct)
      setProductPrices(updatedPrices)
    } catch (error) {
      console.error('Error batch updating prices:', error)
    }
  }

  const calculateFinalPrice = (localPrice: number, adjustment: number) => {
    return localPrice * (1 + adjustment / 100)
  }

  const getPriceChangeIcon = (adjustment: number) => {
    if (adjustment > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (adjustment < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <div className="h-4 w-4" />
  }

  return (
    <div className="space-y-6">
      {/* Product Selector and Controls */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <select
                value={selectedProduct || ''}
                onChange={(e) => onProductSelect?.(e.target.value || null)}
                className="block w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">All Products</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} - {product.name}
                  </option>
                ))}
              </select>
              {selectedProductData && (
                <div className="text-sm text-gray-500">
                  Base Price: €{selectedProductData.base_price.toFixed(2)}
                </div>
              )}
            </div>
            {selectedProduct && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">
                    Base Adjustment (%):
                  </label>
                  <input
                    type="number"
                    value={baseAdjustment}
                    onChange={(e) => setBaseAdjustment(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                    step="0.1"
                  />
                </div>
                <button
                  onClick={handleGeneratePrices}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Generate Prices
                </button>
                <button
                  onClick={handleBatchUpdate}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Apply to All
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Prices Table */}
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Market
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Currency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Local Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Adjustment (%)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Final Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                    Loading prices...
                  </td>
                </tr>
              ) : productPrices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                    {selectedProduct 
                      ? 'No prices found for this product. Generate prices to get started.'
                      : 'Select a product to view and manage its international prices.'
                    }
                  </td>
                </tr>
              ) : (
                productPrices.map((price) => (
                  <tr key={price.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {price.product_sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {price.market_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {price.market_currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {price.local_price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingPrice === price.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={editValues.price_adjustment}
                            onChange={(e) => setEditValues({
                              ...editValues,
                              price_adjustment: e.target.value,
                              final_price: calculateFinalPrice(price.local_price, parseFloat(e.target.value) || 0)
                            })}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                            step="0.1"
                          />
                          {getPriceChangeIcon(parseFloat(editValues.price_adjustment) || 0)}
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-medium ${
                            price.price_adjustment > 0 ? 'text-green-600' : 
                            price.price_adjustment < 0 ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            {price.price_adjustment > 0 ? '+' : ''}{price.price_adjustment.toFixed(1)}%
                          </span>
                          {getPriceChangeIcon(price.price_adjustment)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingPrice === price.id ? (
                        <input
                          type="number"
                          value={editValues.final_price}
                          onChange={(e) => setEditValues({
                            ...editValues,
                            final_price: e.target.value,
                            price_adjustment: ((parseFloat(e.target.value) || 0) / price.local_price - 1) * 100
                          })}
                          className="w-24 px-2 py-1 border border-gray-300 rounded-md text-sm"
                          step="0.01"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-900">
                          {price.final_price.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        price.enabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {price.enabled ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingPrice === price.id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSave(price.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(price.id, price)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deletePrice(price.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

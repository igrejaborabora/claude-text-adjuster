'use client'

import React, { useState } from 'react'
import { 
  Globe, 
  DollarSign, 
  Package, 
  TrendingUp, 
  RefreshCw, 
  Plus,
  Settings,
  BarChart3,
  Download
} from 'lucide-react'
import { useShopifyMarkets } from '@/hooks/useShopifyMarkets'
import { useProducts } from '@/hooks/useProducts'
import { useInternationalPrices } from '@/hooks/useInternationalPrices'
import PriceManagementTable from './PriceManagementTable'
import MarketsExplorer from './MarketsExplorer'

interface InternationalPricingDashboardProps {
  className?: string
}

export default function InternationalPricingDashboard({ className = '' }: InternationalPricingDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'markets' | 'prices'>('overview')
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  
  const { markets, nonEuroMarkets, loading: marketsLoading, stats: marketsStats, syncFromShopify: syncMarkets } = useShopifyMarkets()
  const { products, loading: productsLoading, syncFromShopify: syncProducts } = useProducts()
  const { prices, loading: pricesLoading, stats: pricesStats } = useInternationalPrices()

  const handleSyncAll = async () => {
    try {
      await Promise.all([
        syncMarkets(),
        syncProducts()
      ])
    } catch (error) {
      console.error('Error syncing data:', error)
    }
  }

  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Products</p>
            <p className="text-2xl font-bold text-gray-900">{products.length}</p>
          </div>
          <Package className="h-8 w-8 text-blue-600" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">International Markets</p>
            <p className="text-2xl font-bold text-gray-900">{nonEuroMarkets.length}</p>
          </div>
          <Globe className="h-8 w-8 text-green-600" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Prices</p>
            <p className="text-2xl font-bold text-gray-900">{prices.length}</p>
          </div>
          <DollarSign className="h-8 w-8 text-yellow-600" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Currencies</p>
            <p className="text-2xl font-bold text-gray-900">{marketsStats?.currencies?.length || 0}</p>
          </div>
          <TrendingUp className="h-8 w-8 text-purple-600" />
        </div>
      </div>
    </div>
  )

  const renderProducts = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Products</h2>
          <div className="flex space-x-2">
            <button
              onClick={syncProducts}
              disabled={productsLoading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${productsLoading ? 'animate-spin' : ''}`} />
              Sync from Shopify
            </button>
            <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Base Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                International Prices
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
            {productsLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  Loading products...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  No products found. Sync from Shopify to get started.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    €{product.base_price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.pricing_count || 0} markets
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      product.enabled 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setSelectedProduct(product.id)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Manage Prices
                    </button>
                    <button className="text-gray-600 hover:text-gray-900">
                      <Settings className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderMarkets = () => <MarketsExplorer />

  const renderPrices = () => (
    <PriceManagementTable 
      selectedProduct={selectedProduct}
      onProductSelect={setSelectedProduct}
    />
  )

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'markets', label: 'Markets', icon: Globe },
    { id: 'prices', label: 'Prices', icon: DollarSign },
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">International Pricing Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage product prices across international markets and currencies
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleSyncAll}
                disabled={marketsLoading || productsLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${(marketsLoading || productsLoading) ? 'animate-spin' : ''}`} />
                Sync All
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`group inline-flex items-center py-4 px-6 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="mr-2 h-5 w-5" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'products' && renderProducts()}
        {activeTab === 'markets' && renderMarkets()}
        {activeTab === 'prices' && renderPrices()}
      </div>
    </div>
  )
}

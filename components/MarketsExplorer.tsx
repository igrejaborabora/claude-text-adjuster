'use client'

import React, { useState } from 'react'
import { Globe, RefreshCw, Eye, Filter, Search } from 'lucide-react'
import { useShopifyMarkets } from '@/hooks/useShopifyMarkets'

export default function MarketsExplorer() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCurrency, setFilterCurrency] = useState('all')
  const { markets, nonEuroMarkets, loading, error, stats, syncFromShopify } = useShopifyMarkets()

  const filteredMarkets = nonEuroMarkets.filter((market) => {
    const matchesSearch = market.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         market.country_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         market.currency.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCurrency = filterCurrency === 'all' || market.currency === filterCurrency
    return matchesSearch && matchesCurrency
  })

  const handleSync = async () => {
    try {
      await syncFromShopify()
    } catch (error) {
      console.error('Error syncing markets:', error)
    }
  }

  const currencyOptions = [
    { value: 'all', label: 'All Currencies' },
    ...(stats?.currencies?.map((currency: string) => ({
      value: currency,
      label: currency
    })) || [])
  ]

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Markets</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalMarkets || 0}</p>
            </div>
            <Globe className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Currencies</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.currencies?.length || 0}</p>
            </div>
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold text-sm">$</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Last Sync</p>
              <p className="text-2xl font-bold text-gray-900">Now</p>
            </div>
            <RefreshCw className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">International Markets</h2>
            <button
              onClick={handleSync}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Sync from Shopify
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search markets..."
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={filterCurrency}
                onChange={(e) => setFilterCurrency(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                {currencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Markets List */}
        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="px-6 py-8 text-center text-sm text-gray-500">
              Loading markets...
            </div>
          ) : error ? (
            <div className="px-6 py-8 text-center text-sm text-red-500">
              Error: {error}
            </div>
          ) : filteredMarkets.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-500">
              No markets found matching your criteria.
            </div>
          ) : (
            filteredMarkets.map((market) => (
              <div key={market.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Globe className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {market.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {market.country_name} • {market.country_code}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {market.currency}
                      </div>
                      <div className="text-sm text-gray-500">
                        Non-EUR Market
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        market.enabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {market.enabled ? 'Active' : 'Inactive'}
                      </span>
                      <button className="text-gray-400 hover:text-gray-600">
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Currency Distribution */}
      {stats?.marketsByCurrency && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Markets by Currency</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Object.entries(stats.marketsByCurrency).map(([currency, markets]: [string, any]) => (
                <div key={currency} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{currency}</div>
                  <div className="text-sm text-gray-500">{markets.length} markets</div>
                  <div className="mt-2 space-y-1">
                    {markets.slice(0, 3).map((market: any) => (
                      <div key={market.id} className="text-xs text-gray-400 truncate">
                        {market.name}
                      </div>
                    ))}
                    {markets.length > 3 && (
                      <div className="text-xs text-gray-400">
                        +{markets.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

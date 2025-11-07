import { NextRequest, NextResponse } from 'next/server'
import { supabase, InternationalPrice, Product } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const marketId = searchParams.get('marketId')
    const sku = searchParams.get('sku')
    const action = searchParams.get('action')

    if (action === 'stats') {
      return await getPricingStats()
    } else if (action === 'by-product') {
      return await getPricingByProduct(productId)
    } else if (action === 'by-market') {
      return await getPricingByMarket(marketId)
    } else if (sku) {
      return await getPricingBySku(sku)
    } else {
      return await getAllPricing()
    }
  } catch (error: any) {
    console.error('International pricing API error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getAllPricing() {
  const { data, error } = await supabase
    .from('international_pricing_v')
    .select('*')
    .order('product_name', { ascending: true })

  if (error) throw error

  return NextResponse.json({ pricing: data })
}

async function getPricingBySku(sku: string) {
  const { data, error } = await supabase
    .from('international_pricing_v')
    .select('*')
    .eq('product_sku', sku)
    .order('market_name', { ascending: true })

  if (error) throw error

  return NextResponse.json({ pricing: data })
}

async function getPricingByProduct(productId?: string | null) {
  if (!productId) {
    return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('international_pricing_v')
    .select('*')
    .eq('product_id', productId)
    .order('market_name', { ascending: true })

  if (error) throw error

  return NextResponse.json({ pricing: data })
}

async function getPricingByMarket(marketId?: string | null) {
  if (!marketId) {
    return NextResponse.json({ error: 'Market ID required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('international_pricing_v')
    .select('*')
    .eq('market_id', marketId)
    .order('product_name', { ascending: true })

  if (error) throw error

  return NextResponse.json({ pricing: data })
}

async function getPricingStats() {
  // Get total counts
  const { count: totalProducts, error: productsError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('enabled', true)

  const { count: totalMarkets, error: marketsError } = await supabase
    .from('shopify_markets')
    .select('*', { count: 'exact', head: true })
    .eq('enabled', true)

  const { count: totalPrices, error: pricesError } = await supabase
    .from('international_prices')
    .select('*', { count: 'exact', head: true })
    .eq('enabled', true)

  // Get pricing by currency
  const { data: currencyStats, error: currencyError } = await supabase
    .from('international_pricing_v')
    .select('market_currency')
    .not('market_currency', 'eq', 'EUR')

  const currencyDistribution = currencyStats?.reduce((acc: any, item: any) => {
    acc[item.market_currency] = (acc[item.market_currency] || 0) + 1
    return acc
  }, {})

  if (productsError || marketsError || pricesError || currencyError) {
    throw new Error('Error fetching stats')
  }

  return NextResponse.json({
    stats: {
      totalProducts: totalProducts || 0,
      totalMarkets: totalMarkets || 0,
      totalPrices: totalPrices || 0,
      currencyDistribution,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, pricingData } = body

    switch (action) {
      case 'create':
        return await createPricing(pricingData)
      case 'update':
        return await updatePricing(pricingData)
      case 'batch-update':
        return await batchUpdatePricing(pricingData)
      case 'generate-prices':
        return await generatePricesForProduct(pricingData)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('International pricing POST error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

async function createPricing(pricingData: Partial<InternationalPrice>) {
  const { data, error } = await supabase
    .from('international_prices')
    .insert(pricingData)
    .select()
    .single()

  if (error) throw error

  return NextResponse.json({ success: true, pricing: data })
}

async function updatePricing(pricingData: Partial<InternationalPrice> & { id: string }) {
  const { id, ...updateData } = pricingData
  
  const { data, error } = await supabase
    .from('international_prices')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  return NextResponse.json({ success: true, pricing: data })
}

async function batchUpdatePricing(updates: Array<Partial<InternationalPrice> & { id: string }>) {
  const results = await Promise.allSettled(
    updates.map(async (update) => {
      const { id, ...updateData } = update
      const { data, error } = await supabase
        .from('international_prices')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    })
  )

  const successful = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return NextResponse.json({
    success: true,
    updated: successful,
    failed,
    total: updates.length,
  })
}

async function generatePricesForProduct({ productId, baseAdjustment = 0 }: { productId: string, baseAdjustment?: number }) {
  // Get product details
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single()

  if (productError || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  // Get all non-EUR markets
  const { data: markets, error: marketsError } = await supabase
    .from('non_euro_markets_v')
    .select('*')

  if (marketsError) {
    return NextResponse.json({ error: 'Error fetching markets' }, { status: 500 })
  }

  // Generate prices for each market (simplified - in real app, would use exchange rates)
  const generatedPrices = markets.map((market: any) => ({
    product_id: productId,
    product_sku: product.sku,
    product_name: product.name,
    base_price: product.base_price,
    base_currency: product.base_currency,
    market_id: market.id,
    market_name: market.name,
    market_currency: market.currency,
    local_price: product.base_price, // Would be calculated with exchange rate
    exchange_rate: 1.0, // Would fetch from exchange rate API
    price_adjustment: baseAdjustment,
    final_price: product.base_price * (1 + baseAdjustment / 100),
    enabled: true,
  }))

  // Upsert all prices
  const { error: upsertError } = await supabase
    .from('international_prices')
    .upsert(generatedPrices, {
      onConflict: 'product_id,market_id',
      ignoreDuplicates: false,
    })

  if (upsertError) {
    console.error('Error upserting prices:', upsertError)
    return NextResponse.json({ error: 'Error generating prices' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `Generated prices for ${generatedPrices.length} markets`,
    generated: generatedPrices.length,
  })
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const productId = searchParams.get('productId')
    const marketId = searchParams.get('marketId')

    if (id) {
      // Delete specific price
      const { error } = await supabase
        .from('international_prices')
        .delete()
        .eq('id', id)

      if (error) throw error

      return NextResponse.json({ success: true, message: 'Price deleted' })
    } else if (productId && marketId) {
      // Delete price for specific product/market combination
      const { error } = await supabase
        .from('international_prices')
        .delete()
        .eq('product_id', productId)
        .eq('market_id', marketId)

      if (error) throw error

      return NextResponse.json({ success: true, message: 'Price deleted' })
    } else if (productId) {
      // Delete all prices for a product
      const { error } = await supabase
        .from('international_prices')
        .delete()
        .eq('product_id', productId)

      if (error) throw error

      return NextResponse.json({ success: true, message: 'All product prices deleted' })
    } else {
      return NextResponse.json({ error: 'ID, Product ID, or Market ID required' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('International pricing DELETE error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { supabase, ShopifyMarket } from '@/lib/supabase'

// GraphQL query to fetch Shopify markets
const SHOPIFY_MARKETS_QUERY = `
  query {
    markets(first: 50) {
      edges {
        node {
          id
          name
          currencySettings {
            baseCurrency {
              currencyCode
            }
          }
          countries {
            code
            name
          }
          enabled
        }
      }
    }
  }
`

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'fetch') {
      return await fetchMarketsFromShopify()
    } else if (action === 'non-euro') {
      return await getNonEuroMarkets()
    } else {
      return await getAllMarkets()
    }
  } catch (error: any) {
    console.error('Shopify markets API error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

async function fetchMarketsFromShopify() {
  const shopName = process.env.SHOPIFY_STORE_NAME
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN

  if (!shopName || !accessToken) {
    return NextResponse.json(
      { error: 'Shopify credentials not configured' },
      { status: 500 }
    )
  }

  // Fetch markets from Shopify GraphQL API
  const response = await fetch(`https://${shopName}/admin/api/2023-10/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query: SHOPIFY_MARKETS_QUERY }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Shopify API error: ${errorText}`)
  }

  const data = await response.json()
  const markets = data?.data?.markets?.edges?.map((edge: any) => edge.node) || []

  // Transform and upsert to Supabase
  const transformedMarkets: Partial<ShopifyMarket>[] = markets.map((market: any) => ({
    shopify_market_id: market.id,
    name: market.name,
    currency: market.currencySettings?.baseCurrency?.currencyCode || 'EUR',
    country_code: market.countries?.[0]?.code || '',
    country_name: market.countries?.[0]?.name || '',
    enabled: market.enabled,
  }))

  // Upsert markets to Supabase
  const { error: upsertError } = await supabase
    .from('shopify_markets')
    .upsert(transformedMarkets, {
      onConflict: 'shopify_market_id',
      ignoreDuplicates: false,
    })

  if (upsertError) {
    console.error('Error upserting markets:', upsertError)
    throw upsertError
  }

  return NextResponse.json({
    success: true,
    message: `Synced ${markets.length} markets from Shopify`,
    markets: transformedMarkets,
  })
}

async function getAllMarkets() {
  const { data, error } = await supabase
    .from('shopify_markets')
    .select('*')
    .order('name')

  if (error) throw error

  return NextResponse.json({ markets: data })
}

async function getNonEuroMarkets() {
  const { data, error } = await supabase
    .from('non_euro_markets_v')
    .select('*')
    .order('name')

  if (error) throw error

  // Group by currency for better organization
  const groupedByCurrency = data?.reduce((acc: any, market: ShopifyMarket) => {
    if (!acc[market.currency]) {
      acc[market.currency] = []
    }
    acc[market.currency].push(market)
    return acc
  }, {})

  const stats = {
    totalMarkets: data?.length || 0,
    currencies: Object.keys(groupedByCurrency || {}),
    marketsByCurrency: groupedByCurrency,
  }

  return NextResponse.json({
    markets: data,
    stats,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, marketData } = body

    if (action === 'sync') {
      return await fetchMarketsFromShopify()
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Shopify markets POST error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

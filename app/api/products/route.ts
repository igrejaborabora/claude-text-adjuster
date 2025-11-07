import { NextRequest, NextResponse } from 'next/server'
import { supabase, Product } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const sku = searchParams.get('sku')
    const action = searchParams.get('action')

    if (action === 'with-pricing') {
      return await getProductsWithPricing()
    } else if (id) {
      return await getProductById(id)
    } else if (sku) {
      return await getProductBySku(sku)
    } else {
      return await getAllProducts()
    }
  } catch (error: any) {
    console.error('Products API error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getAllProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error

  return NextResponse.json({ products: data })
}

async function getProductById(id: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error

  return NextResponse.json({ product: data })
}

async function getProductBySku(sku: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('sku', sku)
    .single()

  if (error) throw error

  return NextResponse.json({ product: data })
}

async function getProductsWithPricing() {
  // Get products with their international pricing count
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      international_prices(count)
    `)
    .eq('enabled', true)
    .order('name', { ascending: true })

  if (error) throw error

  // Transform the data to include pricing stats
  const productsWithStats = data?.map((product: any) => ({
    ...product,
    pricing_count: product.international_prices?.length || 0,
    has_pricing: (product.international_prices?.length || 0) > 0,
  })) || []

  return NextResponse.json({ products: productsWithStats })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, productData } = body

    switch (action) {
      case 'create':
        return await createProduct(productData)
      case 'update':
        return await updateProduct(productData)
      case 'sync-from-shopify':
        return await syncProductsFromShopify()
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Products POST error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

async function createProduct(productData: Partial<Product>) {
  const { data, error } = await supabase
    .from('products')
    .insert(productData)
    .select()
    .single()

  if (error) throw error

  return NextResponse.json({ success: true, product: data })
}

async function updateProduct(productData: Partial<Product> & { id: string }) {
  const { id, ...updateData } = productData
  
  const { data, error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  return NextResponse.json({ success: true, product: data })
}

async function syncProductsFromShopify() {
  const shopName = process.env.SHOPIFY_STORE_NAME
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN

  if (!shopName || !accessToken) {
    return NextResponse.json(
      { error: 'Shopify credentials not configured' },
      { status: 500 }
    )
  }

  // GraphQL query to fetch products from Shopify
  const query = `
    query {
      products(first: 50) {
        edges {
          node {
            id
            title
            handle
            status
            variants(first: 1) {
              edges {
                node {
                  id
                  sku
                  price
                  compareAtPrice
                }
              }
            }
            images(first: 1) {
              edges {
                node {
                  url
                }
              }
            }
          }
        }
      }
    }
  `

  const response = await fetch(`https://${shopName}/admin/api/2023-10/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ query }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Shopify API error: ${errorText}`)
  }

  const data = await response.json()
  const products = data?.data?.products?.edges?.map((edge: any) => edge.node) || []

  // Transform and upsert to Supabase
  const transformedProducts = products.map((product: any) => {
    const variant = product.variants?.edges?.[0]?.node
    const image = product.images?.edges?.[0]?.node
    
    return {
      shopify_product_id: product.id,
      sku: variant?.sku || `SHOPIFY-${product.handle}`,
      name: product.title,
      base_price: parseFloat(variant?.price || '0'),
      base_currency: 'EUR', // Assuming base currency is EUR
      description: product.handle,
      image_url: image?.url,
      enabled: product.status === 'ACTIVE',
    }
  })

  // Upsert products to Supabase
  const { error: upsertError } = await supabase
    .from('products')
    .upsert(transformedProducts, {
      onConflict: 'shopify_product_id',
      ignoreDuplicates: false,
    })

  if (upsertError) {
    console.error('Error upserting products:', upsertError)
    throw upsertError
  }

  return NextResponse.json({
    success: true,
    message: `Synced ${products.length} products from Shopify`,
    products: transformedProducts,
  })
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Product deleted' })
  } catch (error: any) {
    console.error('Products DELETE error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

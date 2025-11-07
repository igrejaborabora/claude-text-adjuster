import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface ShopifyMarket {
  id: string
  shopify_market_id: string
  name: string
  currency: string
  country_code: string
  country_name: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface InternationalPrice {
  id: string
  product_id: string
  product_sku: string
  product_name: string
  base_price: number
  base_currency: string
  market_id: string
  market_name: string
  market_currency: string
  local_price: number
  exchange_rate: number
  price_adjustment: number
  final_price: number
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  shopify_product_id: string
  sku: string
  name: string
  base_price: number
  base_currency: string
  description?: string
  image_url?: string
  enabled: boolean
  created_at: string
  updated_at: string
}

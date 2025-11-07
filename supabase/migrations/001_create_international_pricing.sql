-- Create Shopify Markets table
CREATE TABLE IF NOT EXISTS shopify_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_market_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  currency TEXT NOT NULL,
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_product_id TEXT UNIQUE NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  base_currency TEXT NOT NULL DEFAULT 'EUR',
  description TEXT,
  image_url TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create International Prices table
CREATE TABLE IF NOT EXISTS international_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  product_sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  base_currency TEXT NOT NULL DEFAULT 'EUR',
  market_id UUID REFERENCES shopify_markets(id) ON DELETE CASCADE,
  market_name TEXT NOT NULL,
  market_currency TEXT NOT NULL,
  local_price DECIMAL(10,2) NOT NULL,
  exchange_rate DECIMAL(10,6) NOT NULL DEFAULT 1.0,
  price_adjustment DECIMAL(5,2) NOT NULL DEFAULT 0.0, -- percentage adjustment
  final_price DECIMAL(10,2) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, market_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shopify_markets_enabled ON shopify_markets(enabled);
CREATE INDEX IF NOT EXISTS idx_products_enabled ON products(enabled);
CREATE INDEX IF NOT EXISTS idx_international_prices_product ON international_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_international_prices_market ON international_prices(market_id);
CREATE INDEX IF NOT EXISTS idx_international_prices_enabled ON international_prices(enabled);

-- Create view for non-EUR markets (as mentioned in memories)
CREATE OR REPLACE VIEW non_euro_markets_v AS
SELECT 
  id,
  shopify_market_id,
  name,
  currency,
  country_code,
  country_name,
  enabled,
  created_at,
  updated_at
FROM shopify_markets 
WHERE currency != 'EUR' AND enabled = true;

-- Create view for international pricing with product and market info
CREATE OR REPLACE VIEW international_pricing_v AS
SELECT 
  ip.id,
  ip.product_sku,
  ip.product_name,
  ip.base_price,
  ip.base_currency,
  ip.market_name,
  ip.market_currency,
  ip.local_price,
  ip.exchange_rate,
  ip.price_adjustment,
  ip.final_price,
  ip.enabled,
  ip.created_at,
  ip.updated_at,
  p.shopify_product_id,
  sm.shopify_market_id
FROM international_prices ip
JOIN products p ON ip.product_id = p.id
JOIN shopify_markets sm ON ip.market_id = sm.id
WHERE p.enabled = true AND sm.enabled = true;

-- RLS (Row Level Security) policies
ALTER TABLE shopify_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE international_prices ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON shopify_markets
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON products
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON international_prices
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow full access for service role (background jobs, etc.)
CREATE POLICY "Enable full access for service role" ON shopify_markets
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable full access for service role" ON products
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable full access for service role" ON international_prices
  FOR ALL USING (auth.role() = 'service_role');

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_shopify_markets_updated_at BEFORE UPDATE ON shopify_markets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_international_prices_updated_at BEFORE UPDATE ON international_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

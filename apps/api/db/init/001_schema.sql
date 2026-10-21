-- Enjoy Life: schema for starter. Runs once when the PostgreSQL Docker volume is first created.
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);
CREATE TABLE products (
  id UUID PRIMARY KEY,
  category_id UUID REFERENCES categories(id),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  collection_name TEXT NOT NULL DEFAULT '',
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE product_variants (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id),
  sku TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  price_vnd BIGINT NOT NULL CHECK (price_vnd > 0),
  active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(product_id, color, size)
);
CREATE TABLE inventory (
  variant_id UUID PRIMARY KEY REFERENCES product_variants(id),
  on_hand INT NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  reserved INT NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  unavailable INT NOT NULL DEFAULT 0 CHECK (unavailable >= 0),
  CHECK (reserved + unavailable <= on_hand)
);
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  public_token TEXT NOT NULL UNIQUE,
  client_order_key TEXT NOT NULL UNIQUE,
  order_no TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('COD','PAYOS')),
  payment_status TEXT NOT NULL DEFAULT 'UNPAID',
  status TEXT NOT NULL DEFAULT 'PENDING_CONFIRMATION',
  total_vnd BIGINT NOT NULL CHECK (total_vnd >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id),
  variant_id UUID NOT NULL REFERENCES product_variants(id),
  sku_snapshot TEXT NOT NULL,
  name_snapshot TEXT NOT NULL,
  color_snapshot TEXT NOT NULL,
  size_snapshot TEXT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price_vnd BIGINT NOT NULL CHECK (unit_price_vnd > 0)
);
CREATE TABLE stock_movements (
  id BIGSERIAL PRIMARY KEY,
  variant_id UUID NOT NULL REFERENCES product_variants(id),
  order_id UUID REFERENCES orders(id),
  movement_type TEXT NOT NULL,
  on_hand_delta INT NOT NULL DEFAULT 0,
  reserved_delta INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE payment_attempts (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id),
  provider TEXT NOT NULL,
  provider_reference TEXT,
  status TEXT NOT NULL,
  checkout_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE payment_events (
  id BIGSERIAL PRIMARY KEY,
  attempt_id UUID REFERENCES payment_attempts(id),
  external_event_key TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  signature_verified BOOLEAN NOT NULL DEFAULT false,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_stock_movement_variant ON stock_movements(variant_id,created_at DESC);

import type { Product } from "@/lib/types";

const base = process.env.API_INTERNAL_URL ?? "http://localhost:8081";

export async function fetchProducts(query = ""): Promise<Product[]> {
  try {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    const res = await fetch(`${base}/api/v1/products?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data: { items: Product[] } = await res.json();
    return data.items;
  } catch {
    return [];
  }
}

export async function fetchProduct(slug: string): Promise<Product | null> {
  try {
    const res = await fetch(`${base}/api/v1/products/${encodeURIComponent(slug)}`, { cache: "no-store" });
    return res.ok ? ((await res.json()) as Product) : null;
  } catch { return null; }
}

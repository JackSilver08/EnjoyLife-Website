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

export type CatalogParams={
 q?:string;category?:string;color?:string;size?:string;sort?:string;
 min_price?:string;max_price?:string;page?:string
};
export type CatalogResult={items:Product[];total:number;page:number;page_size:number};
export async function fetchCatalog(params:CatalogParams):Promise<CatalogResult>{
 try{
  const q=new URLSearchParams();
  for(const [key,value] of Object.entries(params)){
   if(value)q.set(key,value);
  }
  const response=await fetch(`${base}/api/v1/products/search?${q.toString()}`,{cache:"no-store"});
  if(response.ok)return await response.json() as CatalogResult;
 }catch{}
 return {items:[],total:0,page:1,page_size:12};
}
export async function fetchCatalogFilters():Promise<{colors:string[];sizes:string[]}>{
 try{
  const r=await fetch(`${base}/api/v1/products/filters`,{cache:"no-store"});
  if(r.ok)return await r.json() as {colors:string[];sizes:string[]};
 }catch{}
 return {colors:[],sizes:[]};
}

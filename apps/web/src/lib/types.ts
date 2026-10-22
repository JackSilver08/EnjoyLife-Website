export type Variant = { id:string;sku:string;color:string;size:string;price_vnd:number;available:number; };
export type Product = {id:string;slug:string;name:string;description:string;image_url:string;collection:string;category_slug:string;available?:number;price_vnd:number;variants:Variant[];images?:{url:string;alt:string}[];};
export type CartItem = {variantId:string;productSlug:string;name:string;sku:string;color:string;size:string;price:number;image:string;quantity:number;};
export type OrderResponse = {order_no:string;order_token:string;total_vnd:number;status:string;payment_status:string;};

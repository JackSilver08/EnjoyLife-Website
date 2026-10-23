import {notFound} from "next/navigation";
import {ProductExperience} from "@/components/product-experience";
import Link from "next/link";
import {fetchProduct} from "@/lib/api";
export default async function ProductPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const product=await fetchProduct(slug);
 if(!product)notFound();
 return <div className="detail-page page-shell"><nav className="breadcrumbs" aria-label="Đường dẫn"><Link href="/shop">CỬA HÀNG</Link> / {({ao:"Áo",quan:"Quần",outerwear:"Áo khoác","vay-dam":"Váy đầm","giay-dep":"Giày dép","tui-xach":"Túi xách","trang-suc":"Trang sức","mu-non":"Mũ nón","khan-choang":"Khăn choàng"} as Record<string,string>)[product.category_slug]||"Sản phẩm"} / {product.name}</nav>
 <ProductExperience product={product}/>
 </div>;
}

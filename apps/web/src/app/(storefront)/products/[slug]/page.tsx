import {notFound} from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {fetchProduct} from "@/lib/api";
import {ProductPicker} from "@/components/product-picker";
export default async function ProductPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const product=await fetchProduct(slug);
 if(!product)notFound();
 return <div className="detail-page page-shell"><nav className="breadcrumbs" aria-label="Đường dẫn"><Link href="/shop">CỬA HÀNG</Link> / {product.collection} / {product.name}</nav>
 <div className="detail-layout"><div className="detail-visual">{product.image_url?<Image src={product.image_url} alt={"Hình minh họa sản phẩm "+product.name} width={1100} height={1450} priority sizes="(max-width: 720px) 100vw, 55vw"/>:<div className="empty-photo"/>}</div><ProductPicker product={product}/></div>
 </div>;
}

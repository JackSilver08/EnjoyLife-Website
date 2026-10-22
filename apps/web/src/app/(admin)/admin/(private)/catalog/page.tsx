"use client";
import Link from "next/link";
import {useState} from "react";
import {useAdminData,moneyVND} from "@/components/admin/admin-data";
type Product={id:string;name:string;slug:string;category:string;published:boolean;price_vnd:number;available:number;sku:string};
export default function StaffCatalog(){
 const {data,loading,error,reload}=useAdminData<{items:Product[]}>("admin/products");
 const [q,setQ]=useState("");
 const items=(data?.items??[]).filter(p=>(p.name+" "+p.slug+" "+p.sku).toLowerCase().includes(q.toLowerCase()));
 return <><span className="eyebrow">NHÂN VIÊN / DANH MỤC</span><h1>Tra cứu sản phẩm</h1>
 <p className="admin-subtitle">Xem sản phẩm và tồn kho theo mã hàng. Chỉnh sửa thông tin bán hàng chỉ dành cho quản trị viên.</p>
 <div className="admin-toolbar"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm sản phẩm, mã hàng..." aria-label="Tìm sản phẩm"/><button onClick={()=>void reload()} type="button">Làm mới</button></div>
 {error&&<p className="admin-error" role="alert">{error}</p>}
 <section className="admin-surface">{loading?<p>Đang tải...</p>:items.length===0?<p className="admin-empty">Không tìm thấy sản phẩm.</p>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Tên sản phẩm</th><th>Loại</th><th>Giá từ</th><th>Có thể bán</th><th>Kho hàng</th></tr></thead><tbody>{items.map(p=><tr key={p.id}><td><strong>{p.name}</strong><small>{p.slug}</small></td><td>{p.category}</td><td>{moneyVND(p.price_vnd)}</td><td>{p.available}</td><td><Link className="admin-link" href={"/admin/inventory?product="+p.id}>Xem tồn kho ↗</Link></td></tr>)}</tbody></table></div>}</section></>;
}

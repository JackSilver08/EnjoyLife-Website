"use client";
import {useState,type FormEvent} from "react";
import Link from "next/link";
import {adminAction,moneyVND,useAdminData} from "@/components/admin/admin-data";
type Product={id:string;slug:string;name:string;description:string;image_url:string;collection:string;category:string;published:boolean;price_vnd:number;available:number};
const empty={name:"",slug:"",description:"",image_url:"",collection:"",category:"ao",sku:"",color:"",size:"M",price_vnd:0,opening_stock:0,published:false};
export default function Products(){
 const {data,loading,error,reload}=useAdminData<{items:Product[]}>("admin/products");
 const [adding,setAdding]=useState(false);const [form,setForm]=useState(empty);const [editing,setEditing]=useState<Product|null>(null);const [busy,setBusy]=useState(false);const [notice,setNotice]=useState("");const [search,setSearch]=useState("");
 const products=(data?.items??[]).filter(x=>(x.name+" "+x.slug).toLowerCase().includes(search.toLowerCase()));
 async function create(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setNotice("");
  try{await adminAction("admin/products","POST",form);setNotice("Đã tạo sản phẩm và SKU đầu tiên.");setAdding(false);setForm(empty);await reload()}
  catch(err){setNotice(err instanceof Error?err.message:"Không thể tạo sản phẩm.")}finally{setBusy(false)}
 }
 async function save(){
  if(!editing)return;setBusy(true);setNotice("");
  try{await adminAction("admin/products/"+editing.id,"PATCH",{name:editing.name,description:editing.description,collection:editing.collection,published:editing.published});setNotice("Đã cập nhật "+editing.name);setEditing(null);await reload()}
  catch(err){setNotice(err instanceof Error?err.message:"Không lưu được.")}finally{setBusy(false)}
 }
 return <><span className="eyebrow">QUẢN LÝ / SẢN PHẨM</span><h1>Danh mục sản phẩm</h1><p className="admin-subtitle">Tạo sản phẩm cùng SKU đầu tiên, chỉnh sửa thông tin và kiểm soát trạng thái hiển thị.</p>
 <div className="admin-toolbar"><input placeholder="Tìm tên sản phẩm..." aria-label="Tìm sản phẩm" value={search} onChange={e=>setSearch(e.target.value)}/><button onClick={()=>setAdding(!adding)}>{adding?"Đóng form":"+ Thêm sản phẩm"}</button></div>
 {notice&&<p role="status" className="admin-notice">{notice}</p>}{error&&<p role="alert" className="admin-error">{error}</p>}
 {adding&&<form className="admin-create-form admin-surface" onSubmit={create}><h2>Tạo sản phẩm mới</h2><div className="admin-form-grid">
 <label>Tên sản phẩm<input minLength={3} maxLength={140} required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
 <label>Slug URL<input pattern="[a-z0-9]+(-[a-z0-9]+)*" required value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} placeholder="ao-so-mi-basic"/></label>
 <label>Danh mục<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option value="ao">Áo</option><option value="quan">Quần</option><option value="outerwear">Áo khoác</option></select></label>
 <label>Bộ sưu tập<input value={form.collection} onChange={e=>setForm({...form,collection:e.target.value})}/></label>
 <label>SKU đầu tiên<input required value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})}/></label>
 <label>Màu<input required value={form.color} onChange={e=>setForm({...form,color:e.target.value})}/></label>
 <label>Size<input required value={form.size} onChange={e=>setForm({...form,size:e.target.value})}/></label>
 <label>Giá bán (VND)<input type="number" min={1} required value={form.price_vnd||""} onChange={e=>setForm({...form,price_vnd:Number(e.target.value)})}/></label>
 <label>Số lượng nhập ban đầu<input type="number" min={0} required value={form.opening_stock} onChange={e=>setForm({...form,opening_stock:Number(e.target.value)})}/></label>
 <label>URL ảnh (Unsplash HTTPS)<input value={form.image_url} onChange={e=>setForm({...form,image_url:e.target.value})}/></label>
 <label className="admin-wide">Mô tả<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
 <label className="admin-check"><input type="checkbox" checked={form.published} onChange={e=>setForm({...form,published:e.target.checked})}/> Công khai sản phẩm sau khi tạo</label></div>
 <p>Kiểm tra đúng ảnh, giá, màu và size trước khi công khai.</p><button className="button-dark" type="submit" disabled={busy}>{busy?"ĐANG TẠO...":"TẠO SẢN PHẨM"}</button></form>}
 {editing&&<div className="admin-surface admin-edit-panel"><h2>Chỉnh sửa: {editing.slug}</h2><div className="admin-form-grid"><label>Tên<input value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></label><label>Bộ sưu tập<input value={editing.collection} onChange={e=>setEditing({...editing,collection:e.target.value})}/></label><label className="admin-wide">Mô tả<textarea value={editing.description} onChange={e=>setEditing({...editing,description:e.target.value})}/></label><label className="admin-check"><input type="checkbox" checked={editing.published} onChange={e=>setEditing({...editing,published:e.target.checked})}/> Công khai trên cửa hàng</label></div><div className="admin-row-actions"><button onClick={()=>void save()} disabled={busy}>Lưu thay đổi</button><button onClick={()=>setEditing(null)}>Đóng</button></div></div>}
 <section className="admin-surface">{loading?<p>Đang tải...</p>:!products.length?<p className="admin-empty">Chưa có sản phẩm.</p>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Tên / Slug</th><th>Danh mục</th><th>Giá từ</th><th>Có thể bán</th><th>Hiển thị</th><th>Thao tác</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td><strong>{p.name}</strong><small>{p.slug}</small></td><td>{p.category}</td><td>{moneyVND(p.price_vnd)}</td><td>{p.available}</td><td><span className="admin-pill">{p.published?"Công khai":"Ẩn"}</span></td><td><div className="admin-row-actions"><button onClick={()=>{setEditing({...p});setAdding(false)}}>Sửa</button><Link href={"/products/"+p.slug} target="_blank">Xem shop ↗</Link></div></td></tr>)}</tbody></table></div>}</section>
 <p className="admin-help">Phiên bản này tạo sản phẩm kèm một SKU. Để có thêm biến thể, dùng bước mở rộng quản lý SKU tiếp theo. Không xóa sản phẩm đã phát sinh đơn; dùng trạng thái ẩn.</p>
 </>;
}

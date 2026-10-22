"use client";
import {useState,type FormEvent} from "react";
import Link from "next/link";
import {parseCSV,CSV_TEMPLATE} from "@/lib/catalog-csv";
import {VariantManager} from "@/components/admin/variant-manager";
import {MediaPicker} from "@/components/admin/media-picker";
import {adminAction,moneyVND,useAdminData} from "@/components/admin/admin-data";
type Product={id:string;slug:string;name:string;description:string;image_url:string;collection:string;category:string;published:boolean;price_vnd:number;available:number;sku:string};
const toSlug=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,100).replace(/-$/,"");
const empty={name:"",slug:"",description:"",image_url:"",collection:"",category:"ao",sku:"",color:"",size:"M",price_vnd:0,opening_stock:0,published:false};
export default function Products(){
 const [trash,setTrash]=useState(false);
 const {data,loading,error,reload}=useAdminData<{items:Product[]}>("admin/products"+(trash?"?view=trash":""));
 const [adding,setAdding]=useState(false);const [form,setForm]=useState(empty);const [editing,setEditing]=useState<Product|null>(null);const [busy,setBusy]=useState(false);const [importing,setImporting]=useState(false);const [csvName,setCsvName]=useState("");const [csvRows,setCsvRows]=useState<ReturnType<typeof parseCSV>>([]);const [notice,setNotice]=useState("");const [search,setSearch]=useState("");const [slugCustom,setSlugCustom]=useState(false);
 const products=(data?.items??[]).filter(x=>(x.name+" "+x.slug).toLowerCase().includes(search.toLowerCase()));
 async function create(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setNotice("");
  try{const created=await adminAction("admin/products","POST",{...form,published:false,sku:""});setNotice("Đã tạo sản phẩm ở trạng thái Ẩn. Mã hàng: "+created.sku+".");setAdding(false);setForm(empty);setSlugCustom(false);await reload()}
  catch(err){setNotice(err instanceof Error?err.message:"Không thể tạo sản phẩm.")}finally{setBusy(false)}
 }
 async function save(){
  if(!editing)return;setBusy(true);setNotice("");
  try{await adminAction("admin/products/"+editing.id,"PATCH",{name:editing.name,description:editing.description,collection:editing.collection,published:editing.published,image_url:editing.image_url});setNotice("Đã cập nhật "+editing.name);setEditing(null);await reload()}
  catch(err){setNotice(err instanceof Error?err.message:"Không lưu được.")}finally{setBusy(false)}
 }
 async function archiveProduct(item:Product){
  if(!window.confirm("Chuyển \""+item.name+"\" vào Thùng rác?\\nSản phẩm sẽ ẩn khỏi cửa hàng, nhưng lịch sử đơn hàng và kho vẫn được giữ. Bạn có thể khôi phục sau."))return;
  setBusy(true);setNotice("");
  try{
   const response=await fetch("/api/store/admin/products/"+item.id,{method:"DELETE"});
   const result=await response.json().catch(()=>null);
   if(!response.ok)throw Error(result?.error||"Không xóa được sản phẩm.");
   if(editing?.id===item.id)setEditing(null);
   setNotice("Đã chuyển \""+item.name+"\" vào Thùng rác.");await reload();
  }catch(err){setNotice(err instanceof Error?err.message:"Không xóa được sản phẩm.")}
  finally{setBusy(false)}
 }
 async function restoreProduct(item:Product){
  setBusy(true);setNotice("");
  try{
   const result=await adminAction("admin/products/"+item.id+"/restore","POST");
   setNotice(result.message||"Đã khôi phục sản phẩm ở trạng thái Ẩn.");await reload();
  }catch(err){setNotice(err instanceof Error?err.message:"Không khôi phục được sản phẩm.")}
  finally{setBusy(false)}
 }
 async function selectCSV(file:File|undefined){
  if(!file)return;
  setNotice("");setCsvName(file.name);
  if(file.size>100_000){setNotice("File CSV quá lớn, giới hạn 100 KB.");return}
  try{setCsvRows(parseCSV(await file.text()))}
  catch(err){setCsvRows([]);setNotice(err instanceof Error?err.message:"File CSV không hợp lệ.")}
 }
 async function importCSV(){
  if(!csvRows.length)return;
  setBusy(true);setNotice("");
  try{
   const response=await fetch("/api/store/admin/products/import",{method:"POST",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({rows:csvRows})});
   const json=await response.json().catch(()=>null);
   if(!response.ok)throw Error((json?.error||"Import thất bại.")+(json?.row?" Dòng "+json.row:""));
   setNotice("Đã tạo "+json.created+" sản phẩm ở trạng thái ẨN; kiểm tra tồn và ảnh trước khi công khai.");
   setCsvRows([]);setCsvName("");setImporting(false);await reload();
  }catch(err){setNotice(err instanceof Error?err.message:"Không thể nhập CSV.")}
  finally{setBusy(false)}
 }
 return <><span className="eyebrow">QUẢN LÝ / SẢN PHẨM</span><h1>Danh mục sản phẩm</h1><p className="admin-subtitle">Tạo sản phẩm, tự cấp mã hàng và quản lý trạng thái hiển thị. Sản phẩm đã xóa có thể khôi phục.</p>
 <div className="admin-toolbar"><button type="button" onClick={()=>{setTrash(false);setImporting(v=>!v)}}>{importing?"Đóng import":"Nhập danh mục CSV"}</button><input placeholder="Tìm tên sản phẩm..." aria-label="Tìm sản phẩm" value={search} onChange={e=>setSearch(e.target.value)}/><button onClick={()=>{setAdding(!adding);setTrash(false)}}>{adding?"Đóng form":"+ Thêm sản phẩm"}</button></div>
 <div className="admin-row-actions" style={{margin:"18px 0"}}><button type="button" className={!trash?"button-dark":""} onClick={()=>{setTrash(false);setEditing(null)}}>Đang quản lý</button><button type="button" className={trash?"button-dark":""} onClick={()=>{setTrash(true);setEditing(null);setAdding(false);setImporting(false)}}>Thùng rác</button></div>
 {notice&&<p role="status" className="admin-notice">{notice}</p>}{error&&<p role="alert" className="admin-error">{error}</p>}
 {!trash&&importing&&<section className="admin-surface admin-create-form"><h2>Nhập nhiều sản phẩm từ CSV</h2><p>1 dòng = 1 sản phẩm và một size/màu. Có thể để trống cột sku để hệ thống tự cấp mã SP-001, SP-002... Chỉ tạo bản ẩn, không tự công khai. Tải toàn bộ ảnh lên Thư viện trước, sau đó ghi chính tên file ảnh gốc (ví dụ anh-san-pham.jpg) vào cột image_url; hệ thống tự ghép ảnh. Giá bán phải là số VND hợp lệ.</p><a href={"data:text/csv;charset=utf-8,"+encodeURIComponent(CSV_TEMPLATE)} download="enjoy-life-product-template.csv" className="cms-inline-link">Tải file CSV mẫu ↗</a><label>Chọn file CSV từ máy<input type="file" accept=".csv,text/csv" onChange={e=>void selectCSV(e.target.files?.[0])}/></label><p>{csvName?csvName+" — ":""}{csvRows.length} sản phẩm sẵn sàng.</p><button type="button" className="button-dark" disabled={busy||!csvRows.length} onClick={()=>void importCSV()}>NHẬP {csvRows.length} SẢN PHẨM (ẨN)</button></section>}
 {!trash&&adding&&<form className="admin-create-form admin-surface" onSubmit={create}><h2>Tạo sản phẩm mới</h2><div className="admin-form-grid">
 <label>Tên sản phẩm<input minLength={3} maxLength={140} required value={form.name} onChange={e=>setForm(old=>({...old,name:e.target.value,...(!slugCustom?{slug:toSlug(e.target.value)}:{})}))} placeholder="Ví dụ: Áo sơ mi Linen trắng"/></label>
 <label>Đường dẫn sản phẩm (tự tạo từ tên)<input pattern="[a-z0-9]+(-[a-z0-9]+)*" required readOnly={!slugCustom} value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} placeholder="ten-san-pham"/><small>/{form.slug||"ten-san-pham"} · <button type="button" onClick={()=>{setSlugCustom(v=>!v);if(slugCustom)setForm(old=>({...old,slug:toSlug(old.name)}))}}>{slugCustom?"Dùng đường dẫn tự động":"Chỉnh sửa đường dẫn"}</button></small></label>
 <label>Danh mục<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option value="ao">Áo</option><option value="quan">Quần</option><option value="outerwear">Áo khoác</option><option value="vay-dam">Váy đầm</option><option value="giay-dep">Giày dép</option><option value="tui-xach">Túi xách</option><option value="trang-suc">Trang sức</option><option value="mu-non">Mũ nón</option><option value="khan-choang">Khăn choàng</option></select></label>

 <div className="admin-form-field"><strong>Mã hàng (tự động)</strong><p className="admin-help">Hệ thống cấp mã SP-001, SP-002... khi lưu. Mỗi size/màu có mã riêng, không cần nhập.</p></div>
 <label>Màu<input required value={form.color} onChange={e=>setForm({...form,color:e.target.value})}/></label>
 <label>Size<input required value={form.size} onChange={e=>setForm({...form,size:e.target.value})}/></label>
 <label>Giá bán (VND)<input type="number" min={1} required value={form.price_vnd||""} onChange={e=>setForm({...form,price_vnd:Number(e.target.value)})}/></label>
 <label>Số lượng nhập ban đầu<input type="number" min={0} required value={form.opening_stock} onChange={e=>setForm({...form,opening_stock:Number(e.target.value)})}/></label>
 <div className="admin-wide"><MediaPicker label="Ảnh đại diện sản phẩm" value={form.image_url} onSelect={url=>setForm(v=>({...v,image_url:url}))}/></div>
 <label className="admin-wide">Mô tả<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
 <p className="admin-wide admin-help">Sản phẩm mới được lưu Ẩn. Hãy kiểm tra ảnh, giá, size và tồn trước khi công khai trong phần Sửa.</p></div>
 <p>Kiểm tra đúng ảnh, giá, màu và size trước khi công khai.</p><button className="button-dark" type="submit" disabled={busy}>{busy?"ĐANG TẠO...":"TẠO SẢN PHẨM"}</button></form>}
 {editing&&<div className="admin-surface admin-edit-panel"><h2>Chỉnh sửa: {editing.slug}</h2><div className="admin-form-grid"><label>Tên<input value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></label><div className="admin-wide"><MediaPicker label="Thay ảnh sản phẩm" value={editing.image_url} onSelect={url=>setEditing(v=>v?({...v,image_url:url}):v)}/></div><label className="admin-wide">Mô tả<textarea value={editing.description} onChange={e=>setEditing({...editing,description:e.target.value})}/></label><label className="admin-check"><input type="checkbox" checked={editing.published} onChange={e=>setEditing({...editing,published:e.target.checked})}/> Công khai trên cửa hàng</label></div><div className="admin-row-actions"><button onClick={()=>void save()} disabled={busy}>Lưu thay đổi</button><button onClick={()=>setEditing(null)}>Đóng</button></div><VariantManager productId={editing.id}/></div>}
 <section className="admin-surface">{loading?<p>Đang tải...</p>:!products.length?<p className="admin-empty">Chưa có sản phẩm.</p>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Ảnh</th><th>Mã hàng</th><th>Tên / Slug</th><th>Danh mục</th><th>Giá từ</th><th>Có thể bán</th><th>Hiển thị</th><th>Thao tác</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td>{p.image_url?/* eslint-disable-next-line @next/next/no-img-element */<img src={p.image_url} alt={p.name} style={{width:65,height:75,objectFit:"cover"}}/>:"—"}</td><td><strong>{p.sku||"—"}</strong></td><td><strong>{p.name}</strong><small>{p.slug}</small></td><td>{p.category}</td><td>{moneyVND(p.price_vnd)}</td><td>{p.available}</td><td><span className="admin-pill">{trash?"Đã xóa":p.published?"Công khai":"Ẩn"}</span></td><td><div className="admin-row-actions">{trash?<button type="button" disabled={busy} onClick={()=>void restoreProduct(p)}>Khôi phục</button>:<><button type="button" onClick={()=>{setEditing({...p});setAdding(false)}}>Sửa</button><button type="button" disabled={busy} onClick={()=>void archiveProduct(p)} style={{color:"#a53b2e"}}>Xóa</button>{p.published&&<Link href={"/products/"+p.slug} target="_blank">Xem shop ↗</Link>}</>}</div></td></tr>)}</tbody></table></div>}</section>
 <p className="admin-help">Có thể quản lý màu, size, giá và trạng thái của từng SKU trong phần Sửa sản phẩm. Xóa chuyển sản phẩm vào Thùng rác, giữ nguyên lịch sử đơn và tồn kho. Khôi phục sẽ trở về trạng thái Ẩn.</p>
 </>;
}

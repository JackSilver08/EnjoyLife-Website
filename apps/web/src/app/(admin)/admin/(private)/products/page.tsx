"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import Link from "next/link";
import {parseCSV,CSV_TEMPLATE} from "@/lib/catalog-csv";
import {VariantManager} from "@/components/admin/variant-manager";
import {ProductModelManager} from "@/components/admin/product-model-manager";
import {ColorPicker} from "@/components/admin/color-picker";
import {SizeMultiSelect} from "@/components/admin/size-multi-select";
import {ProductGalleryManager} from "@/components/admin/product-gallery-manager";
import {MediaPicker} from "@/components/admin/media-picker";
import {AdminModal} from "@/components/admin/admin-modal";
import {AdminFeedback} from "@/components/admin/admin-toast";
import {adminAction,moneyVND,useAdminData} from "@/components/admin/admin-data";
import {useAppDialog} from "@/components/app-dialog";
type Product={id:string;slug:string;name:string;description:string;image_url:string;collection:string;category:string;published:boolean;price_vnd:number;available:number;sku:string};
const toSlug=(value:string)=>value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,100).replace(/-$/,"");
const empty={name:"",slug:"",description:"",image_url:"",collection:"",category:"ao",sku:"",color:"",color_hex:"",color_group:"",size:"M",sizes:["M"],price_vnd:0,opening_stock:0,published:false};
export default function Products(){
 const [trash,setTrash]=useState(false);
 const {confirm}=useAppDialog();
 const [colorVersion,setColorVersion]=useState(0);
 const {data,loading,error,reload}=useAdminData<{items:Product[]}>("admin/products"+(trash?"?view=trash":""));
 const [adding,setAdding]=useState(false);const [form,setForm]=useState(empty);const [editing,setEditing]=useState<Product|null>(null);const [busy,setBusy]=useState(false);const [importing,setImporting]=useState(false);const [csvName,setCsvName]=useState("");const [csvRows,setCsvRows]=useState<ReturnType<typeof parseCSV>>([]);const [notice,setNotice]=useState("");const [search,setSearch]=useState("");const [slugCustom,setSlugCustom]=useState(false);
 const products=(data?.items??[]).filter(x=>(x.name+" "+x.slug+" "+x.sku).toLowerCase().includes(search.toLowerCase()));
 const initialOpen=useRef(false);
 useEffect(()=>{
  if(initialOpen.current||!data)return;
  const id=new URLSearchParams(window.location.search).get("edit");
  if(!id)return;
  const item=data.items.find(x=>x.id===id);
  if(!item)return;
  const timeout=window.setTimeout(()=>{
   if(initialOpen.current)return;
   setEditing({...item});setAdding(false);initialOpen.current=true;
  },0);
  return()=>window.clearTimeout(timeout);
 },[data]);
 async function create(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setNotice("");
  try{await adminAction("admin/products","POST",{...form,published:false,sku:""});setNotice("Đã tạo sản phẩm ở trạng thái Ẩn. Bạn có thể bổ sung size/màu rồi công khai khi sẵn sàng.");setAdding(false);setForm(empty);setSlugCustom(false);await reload()}
  catch(err){setNotice(err instanceof Error?err.message:"Không thể tạo sản phẩm.")}finally{setBusy(false)}
 }
 async function save(){
  if(!editing)return;setBusy(true);setNotice("");
  try{await adminAction("admin/products/"+editing.id,"PATCH",{name:editing.name,description:editing.description,collection:editing.collection,published:editing.published,image_url:editing.image_url});setNotice("Đã cập nhật "+editing.name);setEditing(null);await reload()}
  catch(err){setNotice(err instanceof Error?err.message:"Không lưu được.")}finally{setBusy(false)}
 }
 async function archiveProduct(item:Product){
  if(!await confirm({title:"Chuyển sản phẩm vào thùng rác?",message:"\""+item.name+"\" sẽ ẩn khỏi cửa hàng; lịch sử đơn hàng và kho vẫn được giữ. Bạn có thể khôi phục sau.",confirmLabel:"Chuyển vào thùng rác",cancelLabel:"Giữ lại",danger:true}))return;
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
 <div className="admin-toolbar"><button type="button" onClick={()=>{setTrash(false);setImporting(v=>!v);setAdding(false);setEditing(null)}}>{importing?"Đóng import":"Nhập danh mục CSV"}</button><input placeholder="Tìm tên, đường dẫn hoặc mã hàng..." aria-label="Tìm sản phẩm" value={search} onChange={e=>setSearch(e.target.value)}/><button onClick={()=>{setAdding(v=>!v);setEditing(null);setImporting(false);setTrash(false)}}>{adding?"Đóng form":"+ Thêm sản phẩm"}</button></div>
 <div className="admin-row-actions" style={{margin:"18px 0"}}><button type="button" className={!trash?"button-dark":""} onClick={()=>{setTrash(false);setEditing(null)}}>Đang quản lý</button><button type="button" className={trash?"button-dark":""} onClick={()=>{setTrash(true);setEditing(null);setAdding(false);setImporting(false)}}>Thùng rác</button></div>
 <AdminFeedback message={notice} error={error}/>
 {!trash&&importing&&<AdminModal title="Nhập danh mục CSV" subtitle="Nhập hàng loạt sản phẩm và đối chiếu ảnh từ thư viện." onClose={()=>!busy&&setImporting(false)} busy={busy} wide><section className="admin-surface admin-create-form"><h2>Nhập nhiều sản phẩm từ CSV</h2><p>1 dòng = 1 sản phẩm và một size/màu. Có thể để trống cột sku để hệ thống tự cấp mã SP-001, SP-002... Chỉ tạo bản ẩn, không tự công khai. Tải toàn bộ ảnh lên Thư viện trước, sau đó ghi chính tên file ảnh gốc (ví dụ anh-san-pham.jpg) vào cột image_url; hệ thống tự ghép ảnh. Giá bán phải là số VND hợp lệ.</p><a href={"data:text/csv;charset=utf-8,"+encodeURIComponent(CSV_TEMPLATE)} download="enjoy-life-product-template.csv" className="cms-inline-link">Tải file CSV mẫu ↗</a><label>Chọn file CSV từ máy<input type="file" accept=".csv,text/csv" onChange={e=>void selectCSV(e.target.files?.[0])}/></label><p>{csvName?csvName+" — ":""}{csvRows.length} sản phẩm sẵn sàng.</p><button type="button" className="button-dark" disabled={busy||!csvRows.length} onClick={()=>void importCSV()}>NHẬP {csvRows.length} SẢN PHẨM (ẨN)</button></section></AdminModal>}
 {!trash&&adding&&<AdminModal title="Tạo sản phẩm mới" subtitle="Thông tin mẫu, biến thể, giá bán và ảnh. Sản phẩm sẽ tạo ở trạng thái Ẩn." onClose={()=>!busy&&setAdding(false)} busy={busy} wide><form className="admin-create-form admin-surface admin-product-create" onSubmit={create}>
  <h2>Tạo sản phẩm mới</h2>
  <p className="admin-product-form-intro">Chọn sắc độ trực quan, chọn nhiều size để tạo SKU tự động, sau đó nhập giá, tồn kho và ảnh. Sản phẩm sẽ được lưu ở trạng thái Ẩn để bạn kiểm tra trước khi bán.</p>
  <div className="admin-form-grid">
   <label>Tên sản phẩm
    <input minLength={3} maxLength={140} required value={form.name}
     onChange={e=>setForm(old=>({...old,name:e.target.value,...(!slugCustom?{slug:toSlug(e.target.value)}:{})}))}
     placeholder="Ví dụ: Áo sơ mi Linen trắng"/>
   </label>
   <label>Đường dẫn sản phẩm
    <input pattern="[a-z0-9]+(-[a-z0-9]+)*" required readOnly={!slugCustom} value={form.slug}
     onChange={e=>setForm({...form,slug:e.target.value})} placeholder="Tự tạo từ tên sản phẩm"/>
    <small className="admin-product-slug-note">
     /{form.slug||"ten-san-pham"} · <button type="button" onClick={()=>{setSlugCustom(v=>!v);if(slugCustom)setForm(old=>({...old,slug:toSlug(old.name)}))}}>
      {slugCustom?"Dùng đường dẫn tự động":"Chỉnh sửa đường dẫn"}
     </button>
    </small>
   </label>
   <label>Danh mục
    <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
     <option value="ao">Áo</option><option value="quan">Quần</option><option value="outerwear">Áo khoác</option>
     <option value="vay-dam">Váy đầm</option><option value="giay-dep">Giày dép</option>
     <option value="tui-xach">Túi xách</option><option value="trang-suc">Trang sức</option>
     <option value="mu-non">Mũ nón</option><option value="khan-choang">Khăn choàng</option>
    </select>
   </label>
   <div className="admin-wide"><ColorPicker value={{name:form.color,hex:form.color_hex,group:form.color_group}}
     onChange={v=>setForm(old=>({...old,color:v.name,color_hex:v.hex,color_group:v.group}))}/></div>
   <label>Giá bán (VND)
    <input type="number" min={1} step={1} required value={form.price_vnd||""}
     onChange={e=>setForm({...form,price_vnd:Number(e.target.value)})} placeholder="Ví dụ: 329000"/>
   </label>
   <div className="admin-wide"><SizeMultiSelect value={form.sizes} onChange={sizes=>setForm(old=>({...old,sizes,size:sizes[0]??""}))}/></div>
   <label>Số lượng nhập ban đầu
    <input type="number" min={0} step={1} required value={form.opening_stock}
     onChange={e=>setForm({...form,opening_stock:Number(e.target.value)})}/>
   </label>
   <MediaPicker field label="Ảnh đại diện sản phẩm" value={form.image_url}
    onSelect={url=>setForm(v=>({...v,image_url:url}))}/>
   <label className="admin-wide admin-product-description">Mô tả
    <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}
     placeholder="Giới thiệu chất liệu, kiểu dáng và điểm nổi bật của sản phẩm..."/>
   </label>
  </div>
  <div className="admin-product-form-footer">
   <p className="admin-help">Sản phẩm được lưu Ẩn. Bạn có thể bổ sung size, màu và công khai sau khi kiểm tra.</p>
   <button className="button-dark" type="submit" disabled={busy||!form.color.trim()||!form.sizes.length}>{busy?"ĐANG TẠO...":"TẠO SẢN PHẨM"}</button>
  </div>
 </form></AdminModal>}
 {editing&&<AdminModal title={"Chỉnh sửa sản phẩm · "+editing.name} subtitle="Thay đổi thông tin, quản lý màu/size, giá bán và hình ảnh." onClose={()=>!busy&&setEditing(null)} busy={busy} wide><div className="admin-surface admin-edit-panel"><h2>Chỉnh sửa: {editing.slug}</h2><div className="admin-form-grid"><label>Tên<input value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></label><div className="admin-wide"><MediaPicker label="Thay ảnh sản phẩm" value={editing.image_url} onSelect={url=>setEditing(v=>v?({...v,image_url:url}):v)}/></div><label className="admin-wide">Mô tả<textarea value={editing.description} onChange={e=>setEditing({...editing,description:e.target.value})}/></label><label className="admin-check"><input type="checkbox" checked={editing.published} onChange={e=>setEditing({...editing,published:e.target.checked})}/> Công khai trên cửa hàng</label></div><div className="admin-row-actions"><button onClick={()=>void save()} disabled={busy}>Lưu thay đổi</button><button onClick={()=>setEditing(null)}>Đóng</button></div><VariantManager key={editing.id} productId={editing.id} onChanged={()=>setColorVersion(v=>v+1)}/>
 <ProductGalleryManager productId={editing.id} colorVersion={colorVersion} onSaved={cover=>{setEditing(prev=>prev&&prev.id===editing.id?{...prev,image_url:cover}:prev);void reload()}}/>
 <ProductModelManager key={editing.id+"-"+colorVersion} productId={editing.id} colorVersion={colorVersion}/>
 <div className="admin-edit-stock"><Link href={"/admin/inventory?product="+editing.id}>Xem toàn bộ size/màu trong kho ↗</Link></div></div></AdminModal>}
 <section className="admin-surface">{loading?<p>Đang tải...</p>:!products.length?<p className="admin-empty">Chưa có sản phẩm.</p>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Ảnh</th><th>Mã hàng</th><th>Tên / Slug</th><th>Danh mục</th><th>Giá từ</th><th>Có thể bán</th><th>Hiển thị</th><th>Thao tác</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td>{p.image_url?/* eslint-disable-next-line @next/next/no-img-element */<img src={p.image_url} alt={p.name} style={{width:65,height:75,objectFit:"cover"}}/>:"—"}</td><td><strong>{p.sku||"—"}</strong></td><td><strong>{p.name}</strong><small>{p.slug}</small></td><td>{p.category}</td><td>{moneyVND(p.price_vnd)}</td><td>{p.available}</td><td><span className="admin-pill">{trash?"Đã xóa":p.published?"Công khai":"Ẩn"}</span></td><td><div className="admin-row-actions">{trash?<button type="button" disabled={busy} onClick={()=>void restoreProduct(p)}>Khôi phục</button>:<><button type="button" onClick={()=>{setEditing({...p});setAdding(false);setImporting(false)}}>Sửa</button><button type="button" disabled={busy} onClick={()=>void archiveProduct(p)} className="admin-danger">Xóa</button><Link href={"/admin/inventory?product="+p.id}>Xem kho ↗</Link>{p.published&&<Link href={"/products/"+p.slug} target="_blank">Xem shop ↗</Link>}</>}</div></td></tr>)}</tbody></table></div>}</section>
 <p className="admin-help">Có thể quản lý màu, size, giá và trạng thái của từng SKU trong phần Sửa sản phẩm. Xóa chuyển sản phẩm vào Thùng rác, giữ nguyên lịch sử đơn và tồn kho. Khôi phục sẽ trở về trạng thái Ẩn.</p>
 </>;
}

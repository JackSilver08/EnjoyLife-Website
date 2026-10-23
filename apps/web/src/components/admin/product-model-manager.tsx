"use client";
import {useRef,useState} from "react";
import {Box,UploadCloud,Trash2,CheckCircle2} from "lucide-react";
import {useAdminData} from "@/components/admin/admin-data";
type ModelRecord={color:string;model_url:string};
const limit=15*1024*1024;
export function ProductModelManager({productId,colorVersion=0}:{productId:string;colorVersion?:number}){
 const {data,error,loading,reload}=useAdminData<{items:ModelRecord[]}>("admin/products/"+productId+"/models");
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const [chosen,setChosen]=useState("");
 const fileRef=useRef<HTMLInputElement>(null);
 const items=data?.items??[];
 // Remount this panel after a variant change, so the color list is refreshed.
 const color=items.some(x=>x.color===chosen)?chosen:items[0]?.color??"";
 async function upload(files:FileList|null){
  const file=files?.item(0);if(!file||!color)return;
  if(!file.name.toLowerCase().endsWith(".glb")||file.size<20||file.size>limit){
   setMessage("Chỉ hỗ trợ file .glb (GLB 2.0) tối đa 15 MB.");return;
  }
  setBusy(true);setMessage("");
  try{
   const body=new FormData();body.set("color",color);body.set("file",file,file.name);
   const res=await fetch("/api/store/admin/products/"+productId+"/models",{
    method:"POST",body,credentials:"same-origin"
   });
   const json=await res.json().catch(()=>null);
   if(!res.ok)throw Error(json?.error||"Không thể tải mô hình 3D.");
   setMessage("Đã cập nhật mô hình GLB cho màu "+color+".");
   await reload();
  }catch(e){setMessage(e instanceof Error?e.message:"Tải mô hình thất bại.")}
  finally{setBusy(false);if(fileRef.current)fileRef.current.value=""}
 }
 async function unlink(){
  if(!color||busy||!items.find(x=>x.color===color)?.model_url)return;
  if(!window.confirm("Ngừng sử dụng mô hình 3D của màu "+color+"? Ảnh 2D và SKU vẫn giữ nguyên."))return;
  setBusy(true);setMessage("");
  try{
   const res=await fetch("/api/store/admin/products/"+productId+"/models",{
    method:"DELETE",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({color}),credentials:"same-origin"
   });
   const json=await res.json().catch(()=>null);
   if(!res.ok)throw Error(json?.error||"Không thể gỡ mô hình.");
   setMessage("Đã gỡ liên kết GLB cho màu "+color+".");await reload();
  }catch(e){setMessage(e instanceof Error?e.message:"Không gỡ được mô hình.")}
  finally{setBusy(false)}
 }
 const current=items.find(x=>x.color===color);
 return <section className="admin-product-3d" key={colorVersion}>
  <div className="admin-gallery-head">
   <div><h3><Box size={21} aria-hidden="true"/> Model 3D theo màu</h3>
    <p className="admin-help">Tải mô hình GLB 2.0 do cửa hàng sở hữu hoặc được phép sử dụng. Ảnh 2D luôn là chế độ mặc định; mỗi màu có thể có một GLB riêng.</p>
   </div>
  </div>
  {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  {loading?<p>Đang tải các màu...</p>:!items.length?<p>Tạo ít nhất một màu/size trước khi gắn model 3D.</p>:
   <div className="admin-3d-controls">
    <label>Chọn màu cần gắn GLB
     <select value={color} onChange={e=>setChosen(e.target.value)}>
      {items.map(item=><option key={item.color} value={item.color}>
       {item.color}{item.model_url?" · Đã có GLB":""}
      </option>)}
     </select>
    </label>
    <p className="admin-3d-status">{current?.model_url?<><CheckCircle2 size={16}/> Màu {color} đã có model GLB.</>:
     "Màu "+color+" chưa có GLB. Shop sẽ hiển thị avatar 3D minh họa."}</p>
    <input ref={fileRef} type="file" accept=".glb,model/gltf-binary" hidden
     onChange={e=>void upload(e.target.files)} aria-label="Tải mô hình GLB"/>
    <div className="admin-row-actions">
     <button type="button" disabled={busy} onClick={()=>fileRef.current?.click()}>
      <UploadCloud size={16}/> {busy?"ĐANG TẢI...":current?.model_url?"Thay GLB":"Tải GLB"}
     </button>
     {current?.model_url&&<button type="button" disabled={busy}
      onClick={()=>void unlink()}><Trash2 size={16}/> Gỡ liên kết</button>}
    </div>
    <small>Định dạng GLB self-contained, tối đa 15 MB. Mô hình phải đúng kiểu dáng và màu sản phẩm; không dùng avatar minh họa làm ảnh sản phẩm thật.</small>
   </div>}
 </section>;
}

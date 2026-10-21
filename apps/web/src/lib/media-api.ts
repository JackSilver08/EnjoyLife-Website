export type MediaAsset={
 id:string;url:string;original_name:string;content_type:string;size_bytes:number;created_at?:string;
};
export async function fetchMediaAssets():Promise<MediaAsset[]>{
 const response=await fetch("/api/store/admin/media",{cache:"no-store",credentials:"same-origin"});
 const json=await response.json().catch(()=>null);
 if(!response.ok)throw Error(json?.error||"Không tải được thư viện ảnh.");
 return Array.isArray(json?.items)?json.items:[];
}
export async function uploadMedia(file:File):Promise<MediaAsset>{
 if(file.size===0||file.size>8*1024*1024)throw Error("Ảnh phải nhỏ hơn 8 MB.");
 if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw Error("Chỉ hỗ trợ JPG, PNG, WebP.");
 const data=new FormData();
 data.set("file",file,file.name);
 const response=await fetch("/api/store/admin/media",{method:"POST",body:data,credentials:"same-origin"});
 const json=await response.json().catch(()=>null);
 if(!response.ok)throw Error(json?.error||"Không thể tải ảnh lên.");
 return json as MediaAsset;
}

export type MediaZipSummary={uploaded:number;skipped_existing:number;total:number};
export async function uploadMediaZip(file:File):Promise<MediaZipSummary>{
 if(!file.name.toLowerCase().endsWith(".zip")||file.size<1||file.size>30*1024*1024)
  throw Error("Vui lòng chọn ZIP ảnh nhỏ hơn 30 MB.");
 const data=new FormData();
 data.set("file",file,file.name);
 const response=await fetch("/api/store/admin/media/bulk",{method:"POST",body:data,credentials:"same-origin"});
 const json=await response.json().catch(()=>null);
 if(!response.ok)throw Error(json?.error||"Không thể nhập bộ ảnh ZIP.");
 return json as MediaZipSummary;
}

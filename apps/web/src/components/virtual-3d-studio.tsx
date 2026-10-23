"use client";
import {useEffect,useRef,useState} from "react";
import {RotateCcw,RotateCw,ZoomIn,ZoomOut,Play,Pause,RefreshCw,Expand,Box,AlertCircle} from "lucide-react";
import type {StudioHandle} from "@/components/virtual-three-scene";

export function Virtual3DStudio({color,category,modelUrl="",colorName,onBack}:{
 color:string;category:string;modelUrl?:string;colorName:string;onBack:()=>void;
}){
 const host=useRef<HTMLDivElement>(null),studio=useRef<StudioHandle|null>(null);
 const [state,setState]=useState<"loading"|"ready"|"error">("loading");
 const [warning,setWarning]=useState("");
 const [spinning,setSpinning]=useState(false);
 const [full,setFull]=useState(false);
 const stage=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let abandoned=false;
  const target=host.current;
  if(!target)return;
  const start=window.setTimeout(()=>{
   import("@/components/virtual-three-scene").then(async({mountStudio})=>{
    if(abandoned)return;
    try{
     const handle=await mountStudio(target,{color,category,modelUrl,onModelFallback:message=>{
      if(!abandoned)setWarning(message);
     }});
     if(abandoned){handle.dispose();return}
     studio.current=handle;
     setState("ready");
    }catch{
     if(!abandoned)setState("error");
    }
   }).catch(()=>{if(!abandoned)setState("error")});
  },0);
  return ()=>{
   abandoned=true;
   window.clearTimeout(start);
   studio.current?.dispose();studio.current=null;
  };
 },[color,category,modelUrl]);
 useEffect(()=>{
  const listener=()=>setFull(document.fullscreenElement===stage.current);
  document.addEventListener("fullscreenchange",listener);
  return ()=>document.removeEventListener("fullscreenchange",listener);
 },[]);
 const toggleSpin=()=>{
  const next=!spinning;setSpinning(next);studio.current?.autoRotate(next);
 };
 const fullscreen=()=>{if(!stage.current)return;
  if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});
  else void stage.current.requestFullscreen?.().catch(()=>{});
 };
 return <section className="virtual-studio" aria-label="Mô hình thời trang 3D">
  <div className={"virtual-studio-stage"+(full?" is-full":"")} ref={stage}>
   <div ref={host} className="virtual-3d-host" aria-label="Khung 3D có thể xoay bằng chuột hoặc ngón tay"/>
   <div className="virtual-3d-stage-top">
    <span className="virtual-3d-tag"><Box size={14}/> ATELIER / 3D</span>
    <button type="button" onClick={fullscreen} aria-label="Xem 3D toàn màn hình"
     title="Toàn màn hình"><Expand size={16}/></button>
   </div>
   {state==="loading"&&<div className="virtual-3d-overlay" role="status">
    <span className="virtual-3d-spinner"/><p>Đang tải không gian 3D...</p>
   </div>}
   {state==="error"&&<div className="virtual-3d-overlay" role="alert">
    <AlertCircle size={28}/>
    <strong>Không thể mở WebGL trên thiết bị này.</strong>
    <button type="button" onClick={onBack}>Quay về ảnh 2D</button>
   </div>}
   {state==="ready"&&<div className="virtual-3d-controller">
    <button type="button" onClick={()=>studio.current?.turn(-35)} aria-label="Xoay trái 35 độ"><RotateCcw size={17}/></button>
    <button type="button" onClick={()=>studio.current?.turn(35)} aria-label="Xoay phải 35 độ"><RotateCw size={17}/></button>
    <span className="virtual-3d-controller-rule"/>
    <button type="button" onClick={()=>studio.current?.zoom(1)} aria-label="Phóng to"><ZoomIn size={17}/></button>
    <button type="button" onClick={()=>studio.current?.zoom(-1)} aria-label="Thu nhỏ"><ZoomOut size={17}/></button>
    <button type="button" onClick={()=>{studio.current?.reset();setSpinning(false);studio.current?.autoRotate(false)}}
     aria-label="Đưa góc nhìn về ban đầu"><RefreshCw size={17}/></button>
    <span className="virtual-3d-controller-rule"/>
    <button type="button" onClick={toggleSpin} aria-label={spinning?"Dừng xoay tự động":"Bật xoay tự động"}>
     {spinning?<Pause size={17}/>:<Play size={17}/>}
    </button>
   </div>}
  </div>
  <div className="virtual-studio-meta">
   <div><strong>{colorName}</strong>
    <small>{modelUrl?"Mô hình GLB do cửa hàng cung cấp":"Ma-nơ-canh trưng bày bán thân · Màu minh họa"}</small>
   </div>
   <span className="virtual-studio-hint">Kéo để xoay · Cuộn để zoom</span>
  </div>
  {warning&&<p className="virtual-studio-warning" role="status">{warning}</p>}
  <p className="virtual-studio-disclaimer">Ma-nơ-canh 3D minh họa kiểu dáng trưng bày, không phải bản dựng chính xác từ ảnh sản phẩm. Hãy xem ảnh 2D để đối chiếu chất liệu, màu thực tế và chi tiết.</p>
 </section>;
}

"use client";
import {useEffect,useRef,useState} from "react";
import {RotateCcw,RotateCw,ZoomIn,ZoomOut,Play,Pause,RefreshCw,Expand,Box,AlertCircle} from "lucide-react";
import type {StudioHandle} from "@/components/virtual-three-scene";

export function Virtual3DStudio({modelUrl,colorName,productName,onBack}:{
 modelUrl:string;colorName:string;productName:string;onBack:()=>void;
}){
 const host=useRef<HTMLDivElement>(null),studio=useRef<StudioHandle|null>(null);
 const [state,setState]=useState<"loading"|"ready"|"error">("loading");
 const [errorMessage,setErrorMessage]=useState("");
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
     const handle=await mountStudio(target,modelUrl,message=>{
      if(!abandoned){setErrorMessage(message);setState("error")}
     });
     if(abandoned){handle.dispose();return}
     studio.current=handle;setState("ready");
    }catch(error){
     if(!abandoned){
      setErrorMessage(error instanceof Error?error.message:"Không tải được mô hình GLB.");
      setState("error");
     }
    }
   }).catch(()=>{
    if(!abandoned){setErrorMessage("Trình xem 3D không khả dụng.");setState("error")}
   });
  },0);
  return ()=>{
   abandoned=true;window.clearTimeout(start);
   studio.current?.dispose();studio.current=null;
  };
 },[modelUrl]);
 useEffect(()=>{
  const listener=()=>setFull(document.fullscreenElement===stage.current);
  document.addEventListener("fullscreenchange",listener);
  return ()=>document.removeEventListener("fullscreenchange",listener);
 },[]);
 function toggleSpin(){
  const next=!spinning;setSpinning(next);studio.current?.autoRotate(next);
 }
 function fullscreen(){
  if(!stage.current)return;
  if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});
  else void stage.current.requestFullscreen?.().catch(()=>{});
 }
 return <section className="virtual-studio" aria-label={"Mô hình 3D sản phẩm "+productName}>
  <div className={"virtual-studio-stage"+(full?" is-full":"")} ref={stage}>
   <div ref={host} className="virtual-3d-host" aria-label="Xoay sản phẩm bằng chuột hoặc ngón tay"/>
   <div className="virtual-3d-stage-top">
    <span className="virtual-3d-tag"><Box size={14}/> SẢN PHẨM / 3D</span>
    <button type="button" onClick={fullscreen} aria-label="Xem 3D toàn màn hình"
     title="Toàn màn hình"><Expand size={16}/></button>
   </div>
   {state==="loading"&&<div className="virtual-3d-overlay" role="status">
    <span className="virtual-3d-spinner"/><p>Đang tải mô hình 3D của sản phẩm...</p>
   </div>}
   {state==="error"&&<div className="virtual-3d-overlay" role="alert">
    <AlertCircle size={28}/>
    <strong>Không thể hiển thị sản phẩm 3D</strong>
    <p>{errorMessage}</p>
    <button type="button" onClick={onBack}>Xem ảnh 2D của sản phẩm</button>
   </div>}
   {state==="ready"&&<div className="virtual-3d-controller">
    <button type="button" onClick={()=>studio.current?.turn(-35)} aria-label="Xoay trái 35 độ"><RotateCcw size={17}/></button>
    <button type="button" onClick={()=>studio.current?.turn(35)} aria-label="Xoay phải 35 độ"><RotateCw size={17}/></button>
    <span className="virtual-3d-controller-rule"/>
    <button type="button" onClick={()=>studio.current?.zoom(1)} aria-label="Phóng to"><ZoomIn size={17}/></button>
    <button type="button" onClick={()=>studio.current?.zoom(-1)} aria-label="Thu nhỏ"><ZoomOut size={17}/></button>
    <button type="button" onClick={()=>{
     studio.current?.reset();setSpinning(false);studio.current?.autoRotate(false)
    }} aria-label="Đưa góc nhìn về ban đầu"><RefreshCw size={17}/></button>
    <span className="virtual-3d-controller-rule"/>
    <button type="button" onClick={toggleSpin}
     aria-label={spinning?"Dừng xoay tự động":"Bật xoay tự động"}>
     {spinning?<Pause size={17}/>:<Play size={17}/>}
    </button>
   </div>}
  </div>
  <div className="virtual-studio-meta">
   <div><strong>{productName} · {colorName}</strong>
    <small>Mô hình GLB đã được gắn cho màu sản phẩm này</small>
   </div>
   <span className="virtual-studio-hint">Kéo để xoay · Cuộn để zoom</span>
  </div>
  <p className="virtual-studio-disclaimer">Hình 3D do cửa hàng cung cấp. Màu sắc và chất liệu hiển thị có thể khác sản phẩm thực tế; vui lòng đối chiếu ảnh 2D.</p>
 </section>;
}

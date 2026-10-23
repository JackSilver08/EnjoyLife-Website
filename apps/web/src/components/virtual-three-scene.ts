import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";

export type StudioHandle={
 dispose:()=>void;
 reset:()=>void;
 zoom:(direction:1|-1)=>void;
 turn:(degrees:number)=>void;
 autoRotate:(enabled:boolean)=>void;
};

function disposeModel(root:THREE.Object3D){
 const textures=new Set<THREE.Texture>();
 const materials=new Set<THREE.Material>();
 root.traverse(object=>{
  if(!(object instanceof THREE.Mesh))return;
  object.geometry.dispose();
  for(const material of Array.isArray(object.material)?object.material:[object.material]){
   if(!material||materials.has(material))continue;
   materials.add(material);
   for(const item of Object.values(material)){
    if(item instanceof THREE.Texture)textures.add(item);
   }
  }
 });
 textures.forEach(texture=>texture.dispose());
 materials.forEach(material=>material.dispose());
}

// A genuine model viewer. No generated clothing, mannequin or fake replacement.
export async function mountStudio(host:HTMLElement,modelUrl:string,
 onError?:(message:string)=>void):Promise<StudioHandle>{
 if(!/^\/models\/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\.glb$/.test(modelUrl)){
  throw new Error("Đường dẫn mô hình sản phẩm không hợp lệ.");
 }
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"low-power"});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.16;
 renderer.domElement.className="virtual-3d-canvas";
 renderer.domElement.setAttribute("aria-hidden","true");
 host.appendChild(renderer.domElement);
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(35,1,.1,90);
 const controls=new OrbitControls(camera,renderer.domElement);
 controls.enablePan=false;
 controls.enableDamping=true;controls.dampingFactor=.07;
 controls.minPolarAngle=.12;controls.maxPolarAngle=Math.PI-.12;
 scene.add(new THREE.HemisphereLight(0xfff9ef,0x9da6a0,2.0));
 const key=new THREE.DirectionalLight(0xfff4e9,2.4);
 key.position.set(-3,5,5);scene.add(key);
 const fill=new THREE.DirectionalLight(0xe7f1ff,1.05);
 fill.position.set(3,1,-3);scene.add(fill);
 const back=new THREE.DirectionalLight(0xffffff,1.25);
 back.position.set(0,3,-5);scene.add(back);

 let disposed=false,paused=false,raf=0;
 let model:THREE.Group|THREE.Object3D|null=null;
 let home=new THREE.Vector3(0,0,5);
 const onContextLost=(event:Event)=>{
  event.preventDefault();paused=true;window.cancelAnimationFrame(raf);
  onError?.("Thiết bị bị mất kết nối WebGL. Bạn vẫn có thể xem ảnh sản phẩm 2D.");
 };
 renderer.domElement.addEventListener("webglcontextlost",onContextLost);
 const observer=new ResizeObserver(()=>{
  if(disposed)return;
  const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
  renderer.setSize(w,h,false);
  camera.aspect=w/h;camera.updateProjectionMatrix();
 });
 observer.observe(host);
 const onVisibility=()=>{
  const wasPaused=paused;paused=document.hidden;
  if(paused)window.cancelAnimationFrame(raf);else if(wasPaused)draw();
 };
 document.addEventListener("visibilitychange",onVisibility);
 function draw(){
  if(disposed||paused)return;
  controls.update();renderer.render(scene,camera);
  raf=window.requestAnimationFrame(draw);
 }
 function cleanup(){
  if(disposed)return;
  disposed=true;
  window.cancelAnimationFrame(raf);observer.disconnect();
  document.removeEventListener("visibilitychange",onVisibility);
  renderer.domElement.removeEventListener("webglcontextlost",onContextLost);
  controls.dispose();
  if(model)disposeModel(model);
  renderer.dispose();
  if(renderer.domElement.parentElement===host)host.removeChild(renderer.domElement);
 }
 try{
  const gltf=await new GLTFLoader().loadAsync(modelUrl);
  model=gltf.scene;
  if(!model)throw new Error("File GLB không chứa mô hình hiển thị.");
  let meshCount=0;
  model.traverse(object=>{if(object instanceof THREE.Mesh)meshCount++});
  if(!meshCount)throw new Error("File GLB không chứa hình học sản phẩm.");
  model.updateMatrixWorld(true);
  const original=new THREE.Box3().setFromObject(model);
  const size=original.getSize(new THREE.Vector3());
  if(original.isEmpty()||!Number.isFinite(size.length())||size.length()<.0001||
   Math.max(size.x,size.y,size.z)>100000){
   throw new Error("Mô hình sản phẩm có kích thước không hợp lệ.");
  }
  const scale=2.7/Math.max(size.x,size.y,size.z);
  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);
  const center=new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
  model.position.sub(center);
  scene.add(model);
  const scaledSize=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  const aspect=Math.max(.6,host.clientWidth/Math.max(1,host.clientHeight));
  const vertical=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  const distance=Math.max(
   scaledSize.y/(2*vertical),
   scaledSize.x/(2*vertical*aspect),
   scaledSize.z
  )*1.4;
  home=new THREE.Vector3(0,0,Math.max(3.1,distance));
  controls.target.set(0,0,0);
  controls.minDistance=1.6;controls.maxDistance=Math.max(10,home.z*2.5);
  camera.position.copy(home);camera.updateProjectionMatrix();
  controls.update();draw();
  return {
   reset(){controls.autoRotate=false;camera.position.copy(home);controls.target.set(0,0,0);controls.update()},
   zoom(direction){
    const vector=camera.position.clone().sub(controls.target);
    vector.multiplyScalar(direction===1?.85:1.17);
    vector.clampLength(controls.minDistance,controls.maxDistance);
    camera.position.copy(controls.target).add(vector);controls.update();
   },
   turn(degrees){
    const vector=camera.position.clone().sub(controls.target);
    vector.applyAxisAngle(new THREE.Vector3(0,1,0),THREE.MathUtils.degToRad(degrees));
    camera.position.copy(controls.target).add(vector);controls.update();
   },
   autoRotate(enabled){controls.autoRotate=enabled;controls.autoRotateSpeed=1.15},
   dispose:cleanup
  };
 }catch(error){
  cleanup();
  if(error instanceof Error&&error.message.startsWith("File GLB"))throw error;
  throw new Error("Không tải được mô hình GLB của sản phẩm.");
 }
}

import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";

type StudioOptions={
 color:string;category:string;modelUrl?:string;
 onModelFallback?:(message:string)=>void;
};
export type StudioHandle={
 dispose:()=>void;reset:()=>void;zoom:(direction:1|-1)=>void;
 turn:(degrees:number)=>void;autoRotate:(enabled:boolean)=>void;
};
const palette={
 skin:0xb6a18a,skinDark:0xa88e75,neutral:0xe9e8e1,
 neutralPants:0x646a63,hair:0x38362e,shoes:0xe2dacf,
 metal:0x746f64
};

function capsule(radius:number,length:number,color:number,metalness=0){
 return new THREE.Mesh(new THREE.CapsuleGeometry(radius,length,8,16),
  new THREE.MeshStandardMaterial({color,roughness:.87,metalness}));
}
function ellipsoid(rx:number,ry:number,rz:number,color:number){
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,24,18),
  new THREE.MeshStandardMaterial({color,roughness:.87}));
 mesh.scale.set(rx,ry,rz);return mesh;
}
function between(parent:THREE.Group,from:THREE.Vector3,to:THREE.Vector3,
 rTop:number,rBottom:number,color:number,radial=18){
 const direction=new THREE.Vector3().subVectors(to,from),length=direction.length();
 const m=new THREE.Mesh(new THREE.CylinderGeometry(rTop,rBottom,length,radial),
  new THREE.MeshStandardMaterial({color,roughness:.89,side:THREE.DoubleSide}));
 m.position.copy(from).add(to).multiplyScalar(.5);
 m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
 parent.add(m);return m;
}
function outfitBody(parent:THREE.Group,color:number,kind:"shirt"|"dress"|"jacket"){
 const material=new THREE.MeshStandardMaterial({color,roughness:.86,side:THREE.DoubleSide});
 const outer=kind==="jacket"?1.12:1;
 // ring-based torso mesh with a natural shoulder taper and a slightly flared hem.
 const rings=kind==="dress"?[
  [1.01,.35,.19],[.87,.38,.215],[.47,.295,.18],[.1,.30,.205],[-.44,.48,.315],[-.81,.57,.33]
 ]:[[1.01,.34*outer,.19*outer],[.82,.365*outer,.218*outer],[.40,.31*outer,.185*outer],[.06,.33*outer,.218*outer]];
 const points:number[]=[];const indices:number[]=[];const n=32;
 for(const [y,rx,rz] of rings){
  for(let j=0;j<n;j++){const a=2*Math.PI*j/n;points.push(Math.cos(a)*rx,y,Math.sin(a)*rz)}
 }
 for(let i=0;i<rings.length-1;i++)for(let j=0;j<n;j++){
  const a=i*n+j,b=i*n+(j+1)%n,c=(i+1)*n+j,d=(i+1)*n+(j+1)%n;
  indices.push(a,c,b,b,c,d);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(points,3));
 geo.setIndex(indices);geo.computeVertexNormals();
 const torso=new THREE.Mesh(geo,material);parent.add(torso);
 // Loose cylindrical sleeves, shoulder to elbow. Arms remain visible underneath.
 for(const sign of [-1,1]){
  const a=new THREE.Vector3(sign*.34,.91,0);
  const b=new THREE.Vector3(sign*(kind==="jacket"?.55:.50),kind==="jacket"?.36:.59,0);
  between(parent,a,b,kind==="jacket"?.16:.145,kind==="jacket"?.13:.125,color);
 }
 // Neck opening, hem and restrained seam accents.
 const seam=new THREE.MeshStandardMaterial({color:0xf8f3e9,roughness:.95});
 const collar=new THREE.Mesh(new THREE.TorusGeometry(.14,.015,8,30),seam);
 collar.rotation.x=Math.PI/2;collar.position.set(0,1.015,.012);parent.add(collar);
 if(kind==="jacket"){
  const stripe=new THREE.Mesh(new THREE.BoxGeometry(.018,.85,.012),seam);
  stripe.position.set(0,.53,.224);parent.add(stripe);
 }
 const hem=new THREE.Mesh(new THREE.TorusGeometry(
  kind==="dress"?.55:.33,.008,6,40),new THREE.MeshStandardMaterial({color,roughness:.9}));
 hem.rotation.x=Math.PI/2;hem.scale.y=kind==="dress"?.60:.65;
 hem.position.y=kind==="dress"?-.81:.06;parent.add(hem);
}
function pants(parent:THREE.Group,color:number){
 const fabric=new THREE.MeshStandardMaterial({color,roughness:.89,side:THREE.DoubleSide});
 const hips=new THREE.Mesh(new THREE.CylinderGeometry(.285,.34,.35,32),fabric);
 hips.position.y=-.10;parent.add(hips);
 for(const side of [-1,1]){
  between(parent,new THREE.Vector3(side*.165,-.20,0),new THREE.Vector3(side*.185,-1.30,0),
   .185,.126,color,24);
  // visual leg crease
  const line=new THREE.Mesh(new THREE.BoxGeometry(.009,.72,.009),
   new THREE.MeshStandardMaterial({color:0x6e746a,roughness:1,transparent:true,opacity:.18}));
  line.position.set(side*.185,-.8,.139);parent.add(line);
 }
}
function buildMannequin(category:string,garmentHex:string):THREE.Group{
 const root=new THREE.Group();
 const outfit=new THREE.Group();root.add(outfit);
 const garment=new THREE.Color(garmentHex).getHex();
 // Head, neck and subtle neutral arms create a readable human silhouette.
 const head=ellipsoid(.23,.30,.205,palette.skin);head.position.y=1.57;root.add(head);
 const hair=ellipsoid(.236,.125,.208,palette.hair);hair.position.set(0,1.81,-.018);root.add(hair);
 const neck=between(root,new THREE.Vector3(0,1.20,0),new THREE.Vector3(0,1.40,0),
  .10,.105,palette.skin,20);neck.name="neck";
 for(const sign of [-1,1]){
  between(root,new THREE.Vector3(sign*.39,.81,0),new THREE.Vector3(sign*.66,-.30,0),
   .105,.085,palette.skin);
  const hand=ellipsoid(.087,.13,.07,palette.skinDark);hand.position.set(sign*.66,-.39,0);root.add(hand);
  between(root,new THREE.Vector3(sign*.18,-.13,0),new THREE.Vector3(sign*.18,-1.37,0),
   .14,.103,palette.skinDark);
  const shoe=ellipsoid(.17,.085,.30,palette.shoes);shoe.position.set(sign*.185,-1.40,.11);root.add(shoe);
 }
 if(category==="quan"){
  outfitBody(outfit,palette.neutral,"shirt");
  pants(outfit,garment);
 }else if(category==="vay-dam"){
  pants(outfit,palette.neutralPants);
  outfitBody(outfit,garment,"dress");
 }else{
  pants(outfit,palette.neutralPants);
  outfitBody(outfit,garment,category==="outerwear"?"jacket":"shirt");
 }
 return root;
}

function disposeTree(node:THREE.Object3D){
 node.traverse(child=>{
  if(!(child instanceof THREE.Mesh))return;
  child.geometry?.dispose();
  const mats=Array.isArray(child.material)?child.material:[child.material];
  for(const material of mats){
   if(material instanceof THREE.MeshStandardMaterial){
    for(const texture of [material.map,material.normalMap,material.roughnessMap,material.metalnessMap,
      material.aoMap,material.emissiveMap,material.alphaMap])texture?.dispose();
   }
   material?.dispose();
  }
 });
}

// Only invoked after the customer opens the 3D tab: no WebGL or GLB on page load.
export async function mountStudio(host:HTMLElement,options:StudioOptions):Promise<StudioHandle>{
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"low-power"});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.45;
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.domElement.className="virtual-3d-canvas";
 renderer.domElement.setAttribute("aria-hidden","true");
 host.appendChild(renderer.domElement);
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(32,1,.1,100);
 camera.position.set(0,.4,5.8);
 const controls=new OrbitControls(camera,renderer.domElement);
 controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.07;
 controls.minDistance=2.65;controls.maxDistance=8;
 controls.minPolarAngle=.35;controls.maxPolarAngle=Math.PI-.35;
 controls.target.set(0,0.12,0);
 controls.update();
 const ambient=new THREE.HemisphereLight(0xfffdf3,0xb9c2b7,2.25);
 scene.add(ambient);
 const key=new THREE.DirectionalLight(0xfff5e9,3.2);
 key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
 key.shadow.camera.left=-3;key.shadow.camera.right=3;key.shadow.camera.top=4;key.shadow.camera.bottom=-4;
 scene.add(key);
 const fill=new THREE.DirectionalLight(0xdce7e5,2);fill.position.set(4,3,-3);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.CircleGeometry(1.33,64),
  new THREE.MeshStandardMaterial({color:0xe2e1db,roughness:1}));
 floor.rotation.x=-Math.PI/2;floor.position.y=-1.5;floor.receiveShadow=true;scene.add(floor);
 const root=new THREE.Group();scene.add(root);
 const base=buildMannequin(options.category,options.color);
 root.add(base);
 base.traverse(node=>{if(node instanceof THREE.Mesh)node.castShadow=true});
 let disposed=false,paused=false,raf=0;
 const observer=new ResizeObserver(()=>{
  if(disposed)return;
  const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);
  renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
 });
 observer.observe(host);
 function tick(){
  if(disposed||paused)return;
  controls.update();renderer.render(scene,camera);raf=window.requestAnimationFrame(tick);
 }
 const onVisibility=()=>{
  paused=document.hidden;
  if(paused){window.cancelAnimationFrame(raf)}
  else tick();
 };
 document.addEventListener("visibilitychange",onVisibility);
 const onContextLost=(ev:Event)=>{ev.preventDefault();paused=true;window.cancelAnimationFrame(raf);
  options.onModelFallback?.("WebGL bị gián đoạn. Hãy quay về ảnh 2D hoặc thử tải lại.")};
 renderer.domElement.addEventListener("webglcontextlost",onContextLost);
 tick();
 if(options.modelUrl&&/^\/models\/[a-f0-9-]{36}\.glb$/.test(options.modelUrl)){
  try{
   const gltf=await new GLTFLoader().loadAsync(options.modelUrl);
   if(disposed){disposeTree(gltf.scene)}
   else{
    const imported=gltf.scene;
    imported.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(imported),s=bounds.getSize(new THREE.Vector3());
    if(!isFinite(s.y)||s.y<.0001||s.length()>10000)throw Error("Empty model");
    const scale=Math.min(3.0/Math.max(s.x,s.y,s.z),100);
    imported.scale.setScalar(scale);
    imported.updateMatrixWorld(true);
    const center=new THREE.Box3().setFromObject(imported).getCenter(new THREE.Vector3());
    imported.position.sub(center);
    imported.traverse(node=>{if(node instanceof THREE.Mesh)node.castShadow=true});
    root.remove(base);disposeTree(base);
    root.add(imported);
   }
  }catch{
   if(!disposed)options.onModelFallback?.("Không tải được GLB. Đang hiển thị avatar 3D minh họa.");
  }
 }
 return {
  reset(){controls.reset();camera.position.set(0,.4,5.8);controls.target.set(0,.12,0);controls.update()},
  zoom(direction){camera.position.multiplyScalar(direction===1?.86:1.16);controls.update()},
  turn(degrees){const shift=degrees*Math.PI/180;const v=camera.position.clone().sub(controls.target);v.applyAxisAngle(new THREE.Vector3(0,1,0),shift);camera.position.copy(controls.target).add(v);controls.update()},
  autoRotate(enabled){controls.autoRotate=enabled;controls.autoRotateSpeed=1.1},
  dispose(){
   if(disposed)return;
   disposed=true;window.cancelAnimationFrame(raf);observer.disconnect();
   document.removeEventListener("visibilitychange",onVisibility);
   renderer.domElement.removeEventListener("webglcontextlost",onContextLost);
   controls.dispose();disposeTree(root);floor.geometry.dispose();
   (floor.material as THREE.Material).dispose();renderer.dispose();
   if(renderer.domElement.parentElement===host)host.removeChild(renderer.domElement);
  }
 };
}

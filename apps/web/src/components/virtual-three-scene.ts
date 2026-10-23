import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";

type StudioOptions={
 color:string;
 category:string;
 modelUrl?:string;
 onModelFallback?:(message:string)=>void;
};
export type StudioHandle={
 dispose:()=>void;
 reset:()=>void;
 zoom:(direction:1|-1)=>void;
 turn:(degrees:number)=>void;
 autoRotate:(enabled:boolean)=>void;
};

type ProfilePoint=[height:number,width:number,depth:number];
const IVORY=0xece6d8;
const OAK=0xa47549;
const OAK_DARK=0x765033;

// Deterministic fine-grain canvas-free texture: subtle woven fabric, no network requests.
function makeClothBump():THREE.DataTexture{
 const n=128,raw=new Uint8Array(n*n*4);
 let seed=20261023;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  seed=(1664525*seed+1013904223)>>>0;
  const grain=(seed>>>24)-128;
  const weave=((x%3===0?6:-3)+(y%3===0?6:-3));
  const light=Math.max(0,Math.min(255,128+Math.round(grain*.10)+weave));
  const i=(y*n+x)*4;
  raw[i]=raw[i+1]=raw[i+2]=light;raw[i+3]=255;
 }
 const texture=new THREE.DataTexture(raw,n,n,THREE.RGBAFormat);
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.repeat.set(5,6);
 texture.generateMipmaps=true;
 texture.minFilter=THREE.LinearMipmapLinearFilter;
 texture.magFilter=THREE.LinearFilter;
 texture.needsUpdate=true;
 return texture;
}
function fabric(color:THREE.ColorRepresentation,bump:THREE.Texture):THREE.MeshPhysicalMaterial{
 return new THREE.MeshPhysicalMaterial({
  color,roughness:.92,metalness:0,sheen:.28,sheenRoughness:.93,
  side:THREE.DoubleSide,bumpMap:bump,bumpScale:.009
 });
}
function addMesh(group:THREE.Group,geometry:THREE.BufferGeometry,material:THREE.Material,
 name:string):THREE.Mesh{
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
 return mesh;
}
function profileMesh(group:THREE.Group,profile:ProfilePoint[],material:THREE.Material,
 name:string,frontShape=false):THREE.Mesh{
 const vertices:number[]=[],uvs:number[]=[],indices:number[]=[];
 const curve=new THREE.CatmullRomCurve3(profile.map(([y,rx,rz])=>new THREE.Vector3(rx,y,rz)),false,"centripetal");
 const levels=76,segments=64;
 for(let i=0;i<=levels;i++){
  const p=curve.getPoint(i/levels);
  for(let j=0;j<=segments;j++){
   const theta=j/segments*Math.PI*2;
   const sin=Math.sin(theta),cos=Math.cos(theta);
   // +Z is the front. Small paired bust volume creates a dress-form silhouette.
   const chest=Math.exp(-Math.pow((p.y-.91)/.26,2));
   const paired=frontShape&&sin>0?chest*.035*Math.pow(Math.sin(theta),2)*
    (1+.28*Math.cos(theta*2)):0;
   vertices.push(p.x*cos,p.y,p.z*sin+paired);
   uvs.push(j/segments,i/levels);
   if(i<levels&&j<segments){
    const a=i*(segments+1)+j,b=a+segments+1;
    indices.push(a,b,a+1,b,b+1,a+1);
   }
  }
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
 geo.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));
 geo.setIndex(indices);geo.computeVertexNormals();
 return addMesh(group,geo,material,name);
}
function tube(group:THREE.Group,a:THREE.Vector3,b:THREE.Vector3,r1:number,r2:number,
 material:THREE.Material,name:string):THREE.Mesh{
 const v=new THREE.Vector3().subVectors(b,a);
 const mesh=addMesh(group,new THREE.CylinderGeometry(r2,r1,v.length(),32,1,false),
  material,name);
 mesh.position.copy(a).add(b).multiplyScalar(.5);
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());
 return mesh;
}
function seamRing(group:THREE.Group,rx:number,rz:number,y:number,color:number,
 width=.012,name="Stitching"){
 const mat=new THREE.MeshStandardMaterial({color,roughness:.95});
 const mesh=addMesh(group,new THREE.TorusGeometry(1,width,8,64),mat,name);
 mesh.rotation.x=Math.PI/2;mesh.scale.set(rx,rz,1);mesh.position.y=y;
 return mesh;
}
function woodenStand(group:THREE.Group,from:number,to:number,withFinial=true){
 const wood=new THREE.MeshStandardMaterial({color:OAK,roughness:.62});
 const dark=new THREE.MeshStandardMaterial({color:OAK_DARK,roughness:.58});
 const steel=new THREE.MeshStandardMaterial({color:0x938a7e,metalness:.52,roughness:.48});
 const pole=addMesh(group,new THREE.CylinderGeometry(.032,.036,from-to,16),
  wood,"Wooden mannequin post");pole.position.y=(from+to)/2;
 const base=addMesh(group,new THREE.CylinderGeometry(.42,.44,.055,48),
  dark,"Mannequin display base");base.position.y=to;
 const foot=addMesh(group,new THREE.CylinderGeometry(.14,.16,.035,32),
  steel,"Mannequin support collar");foot.position.y=to+.04;
 if(withFinial){
  const finial=addMesh(group,new THREE.LatheGeometry([
   new THREE.Vector2(.066,0),new THREE.Vector2(.071,.08),
   new THREE.Vector2(.079,.16),new THREE.Vector2(.045,.24),
   new THREE.Vector2(.012,.31)
  ],48),wood,"Wooden dress form finial");
  finial.position.y=1.43;
  const collar=addMesh(group,new THREE.CylinderGeometry(.092,.09,.038,32),
   dark,"Wooden neck cap");collar.position.y=1.445;
 }
}
function buildDressForm(group:THREE.Group,bump:THREE.Texture,slim=false){
 const torso:ProfilePoint[]=[
  [1.42,.105,.111],[1.34,.139,.143],[1.28,.23,.17],
  [1.22,.39,.20],[1.15,.50,.236],[1.04,.52,.268],
  [.88,.47,.295],[.71,.405,.272],[.50,.34,.235],
  [.26,.335,.235],[.07,.388,.270],[-.16,.424,.303],
  [-.37,.418,.300],[-.53,.369,.276]
 ].map(([y,x,z])=>[y,slim?x*.95:x,z] as ProfilePoint);
 profileMesh(group,torso,fabric(IVORY,bump),"Ivory linen dress form bust",true);
 seamRing(group,.108,.113,1.42,0xd0c6b7,.012,"Neck piping");
 seamRing(group,.367,.273,-.53,0xd1c4b0,.009,"Dress form lower seam");
 woodenStand(group,-.51,-1.34,true);
}
function makeUpperGarment(group:THREE.Group,garment:number,bump:THREE.Texture,
 kind:"tee"|"jacket"|"dress"){
 const cloth=fabric(garment,bump);
 const bigger=kind==="jacket"?1.06:1;
 const hem=kind==="dress"?-1.05:-.35;
 const profile:ProfilePoint[]=[
  [1.29,.166,.165],[1.25,.247,.177],
  [1.18,.40*bigger,.213*bigger],[1.10,.515*bigger,.255*bigger],
  [.97,.532*bigger,.29*bigger],[.80,.485*bigger,.306*bigger],
  [.63,.421*bigger,.286*bigger],[.43,.373*bigger,.261*bigger],
  [.23,.385*bigger,.259*bigger],[.03,.425*bigger,.287*bigger],
  [-.26,.448*bigger,.316*bigger],
  ...(kind==="dress"?[[-.64,.57,.36],[-1.05,.72,.41]] as ProfilePoint[]:
   [[-.36,.438*bigger,.301*bigger]] as ProfilePoint[])
 ];
 profileMesh(group,profile,cloth,"Displayed garment: "+kind,true);
 // Short, sculpted sleeves hug the shoulder of the torso — no floating hands/arms.
 for(const sign of [-1,1]){
  const shoulder=new THREE.Vector3(sign*.452,1.115,0);
  const outer=new THREE.Vector3(sign*(kind==="jacket"?.725:.67),
   kind==="jacket"?.73:.79,-.012);
  tube(group,shoulder,outer,kind==="jacket"?.19:.171,kind==="jacket"?.145:.131,
   cloth,"Garment shoulder sleeve");
  const cuff=new THREE.Mesh(new THREE.TorusGeometry(kind==="jacket"?.145:.132,.009,8,36),
   new THREE.MeshStandardMaterial({color:new THREE.Color(garment).multiplyScalar(.81),roughness:.94}));
  cuff.name="Sleeve hem";cuff.position.copy(outer);
  cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),
   new THREE.Vector3().subVectors(outer,shoulder).normalize());
  group.add(cuff);
 }
 seamRing(group,.167,.162,1.295,new THREE.Color(garment).multiplyScalar(.76).getHex(),.014,
  "Garment collar");
 if(kind==="jacket"){
  const zipper=addMesh(group,new THREE.CylinderGeometry(.008,.008,1.5,8),
   new THREE.MeshStandardMaterial({color:0xb7aa94,roughness:.7}),
   "Jacket opening");
  zipper.position.set(0,.52,.324);
 }
 seamRing(group,kind==="dress"?.70:.43,kind==="dress"?.4:.30,hem,
  new THREE.Color(garment).multiplyScalar(.88).getHex(),.008,"Garment hem");
}
function makeTrouserDisplay(group:THREE.Group,garment:number,bump:THREE.Texture){
 const cream=fabric(IVORY,bump),cloth=fabric(garment,bump);
 profileMesh(group,[[1.12,.20,.17],[1.03,.34,.22],[.82,.40,.25],
  [.56,.41,.285],[.3,.36,.277]] as ProfilePoint[],cream,"Hip mannequin",false);
 profileMesh(group,[[.95,.38,.235],[.88,.42,.255],[.55,.44,.305],[.36,.45,.327],
  [.18,.405,.29]] as ProfilePoint[],cloth,"Trouser waistband and hips");
 for(const sign of [-1,1]){
  tube(group,new THREE.Vector3(sign*.224,.3,0),
   new THREE.Vector3(sign*.248,-1.12,0),.225,.145,cloth,
   "Trouser leg");
  // A lower cuff reinforces the tailoring rather than adding human legs.
 }
 seamRing(group,.39,.25,.94,new THREE.Color(garment).multiplyScalar(.81).getHex(),.012,
  "Trouser waist seam");
 woodenStand(group,.28,-1.40,false);
}
function buildDisplay(category:string,colorHex:string,bump:THREE.Texture):THREE.Group{
 const root=new THREE.Group();
 const color=new THREE.Color(colorHex).getHex();
 if(category==="quan")makeTrouserDisplay(root,color,bump);
 else{
  buildDressForm(root,bump,category==="vay-dam");
  makeUpperGarment(root,color,bump,
   category==="outerwear"?"jacket":category==="vay-dam"?"dress":"tee");
 }
 // No human head, hair, hands, legs or feet. This is a boutique display form.
 return root;
}
function disposeTree(node:THREE.Object3D){
 node.traverse(item=>{
  if(!(item instanceof THREE.Mesh))return;
  item.geometry?.dispose();
  const materials=Array.isArray(item.material)?item.material:[item.material];
  for(const mat of materials){
   if(mat instanceof THREE.MeshStandardMaterial){
    for(const texture of [mat.map,mat.bumpMap,mat.normalMap,mat.roughnessMap,
     mat.metalnessMap,mat.aoMap,mat.emissiveMap,mat.alphaMap])texture?.dispose();
   }
   mat?.dispose();
  }
 });
}

export async function mountStudio(host:HTMLElement,options:StudioOptions):Promise<StudioHandle>{
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"low-power"});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.12;
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.domElement.className="virtual-3d-canvas";
 renderer.domElement.setAttribute("aria-hidden","true");
 host.appendChild(renderer.domElement);
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(33,1,.1,80);
 const home=new THREE.Vector3(0,.45,4.8),focus=new THREE.Vector3(0,.20,0);
 camera.position.copy(home);
 const controls=new OrbitControls(camera,renderer.domElement);
 controls.enablePan=false;
 controls.enableDamping=true;controls.dampingFactor=.085;
 controls.minDistance=2.5;controls.maxDistance=7.5;
 controls.minPolarAngle=.35;controls.maxPolarAngle=Math.PI-.35;
 controls.target.copy(focus);controls.update();
 scene.add(new THREE.HemisphereLight(0xffffff,0xb6b5ad,1.9));
 const key=new THREE.DirectionalLight(0xfff4e7,2.65);
 key.position.set(-3,5,5);key.castShadow=true;
 key.shadow.mapSize.set(1024,1024);
 key.shadow.camera.left=-3;key.shadow.camera.right=3;
 key.shadow.camera.top=4;key.shadow.camera.bottom=-4;
 scene.add(key);
 const fill=new THREE.DirectionalLight(0xe5ebed,1.35);
 fill.position.set(4,2,-2);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.CircleGeometry(1.32,64),
  new THREE.MeshStandardMaterial({color:0xe4e2db,roughness:1}));
 floor.rotation.x=-Math.PI/2;floor.position.y=-1.42;floor.receiveShadow=true;
 scene.add(floor);
 const root=new THREE.Group();scene.add(root);
 const bump=makeClothBump();
 const defaultModel=buildDisplay(options.category,options.color,bump);
 root.add(defaultModel);
 let disposed=false,paused=false,raf=0;
 const observer=new ResizeObserver(()=>{
  if(disposed)return;
  const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);
  renderer.setSize(width,height,false);
  camera.aspect=width/height;camera.updateProjectionMatrix();
 });
 observer.observe(host);
 function draw(){
  if(disposed||paused)return;
  controls.update();renderer.render(scene,camera);raf=window.requestAnimationFrame(draw);
 }
 const onVisibility=()=>{
  const wasPaused=paused;paused=document.hidden;
  if(paused)window.cancelAnimationFrame(raf);else if(wasPaused)draw();
 };
 document.addEventListener("visibilitychange",onVisibility);
 const onContextLost=(event:Event)=>{
  event.preventDefault();paused=true;window.cancelAnimationFrame(raf);
  options.onModelFallback?.("WebGL bị gián đoạn. Hãy quay về ảnh 2D hoặc thử tải lại.");
 };
 renderer.domElement.addEventListener("webglcontextlost",onContextLost);
 draw();
 if(options.modelUrl&&/^\/models\/[a-f0-9-]{36}\.glb$/.test(options.modelUrl)){
  try{
   const gltf=await new GLTFLoader().loadAsync(options.modelUrl);
   if(disposed){disposeTree(gltf.scene)}
   else{
    const imported=gltf.scene;
    imported.updateMatrixWorld(true);
    const size=new THREE.Box3().setFromObject(imported).getSize(new THREE.Vector3());
    if(!isFinite(size.y)||size.y<.0001||size.length()>10000)throw Error("Invalid model bounds");
    imported.scale.setScalar(Math.min(2.65/Math.max(size.x,size.y,size.z),100));
    imported.updateMatrixWorld(true);
    const center=new THREE.Box3().setFromObject(imported).getCenter(new THREE.Vector3());
    imported.position.sub(center);
    imported.traverse(node=>{if(node instanceof THREE.Mesh)node.castShadow=true});
    root.remove(defaultModel);disposeTree(defaultModel);
    root.add(imported);
    floor.visible=false;
    controls.target.copy(new THREE.Vector3(0,0,0));
    camera.position.set(0,.12,4.65);controls.update();
  }
  }catch{
   if(!disposed)options.onModelFallback?.("Không tải được GLB. Đang hiển thị ma-nơ-canh 3D minh họa.");
  }
 }
 function reset(){
  controls.autoRotate=false;
  const target=root.children.includes(defaultModel)?focus:new THREE.Vector3(0,0,0);
  controls.target.copy(target);
  camera.position.copy(target===focus?home:new THREE.Vector3(0,.12,4.65));
  controls.update();
 }
 return {
  reset,
  zoom(direction){
   const offset=camera.position.clone().sub(controls.target);
   offset.multiplyScalar(direction===1?.85:1.18);
   offset.clampLength(controls.minDistance,controls.maxDistance);
   camera.position.copy(controls.target).add(offset);controls.update();
  },
  turn(degrees){
   const offset=camera.position.clone().sub(controls.target);
   offset.applyAxisAngle(new THREE.Vector3(0,1,0),degrees*Math.PI/180);
   camera.position.copy(controls.target).add(offset);controls.update();
  },
  autoRotate(enabled){controls.autoRotate=enabled;controls.autoRotateSpeed=1.15},
  dispose(){
   if(disposed)return;
   disposed=true;
   window.cancelAnimationFrame(raf);observer.disconnect();
   document.removeEventListener("visibilitychange",onVisibility);
   renderer.domElement.removeEventListener("webglcontextlost",onContextLost);
   controls.dispose();disposeTree(root);
   floor.geometry.dispose();(floor.material as THREE.Material).dispose();
   bump.dispose();renderer.dispose();
   if(renderer.domElement.parentElement===host)host.removeChild(renderer.domElement);
  }
 };
}

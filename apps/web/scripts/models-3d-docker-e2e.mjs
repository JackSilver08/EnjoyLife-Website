// 3D studio BFF regression with a real persisted self-contained GLB 2.0 model.
const origin="http://127.0.0.1:3000";
function check(ok,message){if(!ok)throw Error(message)}
async function api(path,opts={}){
 const {method="GET",cookie="",body}=opts;
 const response=await fetch(origin+"/api/store/"+path,{method,
  headers:{...(cookie?{Cookie:cookie}:{}),...(method!=="GET"?{
   "Content-Type":"application/json",Origin:origin,"Sec-Fetch-Site":"same-origin"}:{})},
  ...(method!=="GET"?{body:JSON.stringify(body??{})}:{})});
 const txt=await response.text();let json=null;try{json=JSON.parse(txt)}catch{}
 return {status:response.status,json,text:txt,cookie:response.headers.get("set-cookie")?.split(";")[0]??""};
}
function makeGLB(external=false){
 const asset={asset:{version:"2.0"},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],
  meshes:[{primitives:[{attributes:{POSITION:0}}]}],
  accessors:[{bufferView:0,componentType:5126,count:3,type:"VEC3",min:[-.4,0,0],max:[.4,1,0]}],
  bufferViews:[{buffer:0,byteOffset:0,byteLength:36}],
  buffers:[{byteLength:36,...(external?{uri:"https://example.org/data.bin"}:{})}]};
 const json=Buffer.from(JSON.stringify(asset));
 const length=Math.ceil(json.length/4)*4;
 const b=Buffer.alloc(36);
 new Float32Array(b.buffer,b.byteOffset,9).set([-.4,0,0,.4,0,0,0,1,0]);
 const output=Buffer.alloc(12+8+length+8+b.length);
 output.write("glTF",0,"ascii");output.writeUInt32LE(2,4);output.writeUInt32LE(output.length,8);
 output.writeUInt32LE(length,12);output.write("JSON",16,"ascii");
 json.copy(output,20);output.fill(0x20,20+json.length,20+length);
 const offset=20+length;output.writeUInt32LE(b.length,offset);
 output.write("BIN\u0000",offset+4,"binary");b.copy(output,offset+8);
 return output;
}
async function upload(productId,color,buffer,cookie){
 const form=new FormData();
 form.set("color",color);
 form.set("file",new Blob([buffer],{type:"model/gltf-binary"}),"outfit.glb");
 const res=await fetch(origin+"/api/store/admin/products/"+productId+"/models",{
  method:"POST",headers:{...(cookie?{Cookie:cookie}:{}),Origin:origin,
   "Sec-Fetch-Site":"same-origin"},body:form});
 return {status:res.status,json:await res.json().catch(()=>null)};
}
const login=await api("auth/admin-demo",{method:"POST",body:{username:"admin",password:"admin"}});
check(login.status===200&&login.cookie,"Failed Admin login");
const cookie=login.cookie;
const slug="model-ci-"+Date.now().toString(36);
const product=await api("admin/products",{method:"POST",cookie,body:{
 name:"3D Model Studio CI",slug,category:"ao",color:"Kem",color_hex:"#E9DCC8",
 size:"M",price_vnd:240000,opening_stock:3,published:true
}});
check(product.status===201&&product.json?.id,"Could not create fixture: "+product.text);
const productId=product.json.id;
const before=await api("products/"+slug);
check(before.status===200&&before.json?.colors?.find(c=>c.name==="Kem")?.model_url==="",
 "New color should have no GLB by default");
const unauth=await upload(productId,"Kem",makeGLB(),"");
check(unauth.status===401||unauth.status===403,"Model upload must require an Admin session");
const external=await upload(productId,"Kem",makeGLB(true),cookie);
check(external.status===400,"External glTF URI must be rejected");
const badColor=await upload(productId,"Không tồn tại",makeGLB(),cookie);
check(badColor.status===404,"GLB must be linked only to an existing color");
const good=await upload(productId,"Kem",makeGLB(),cookie);
check(good.status===201&&/^\/models\/[a-f0-9-]{36}\.glb$/.test(good.json?.model_url??""),
 "Cannot upload GLB to product: "+JSON.stringify(good));
const listed=await api("admin/products/"+productId+"/models",{cookie});
check(listed.status===200&&listed.json.items?.find(x=>x.color==="Kem")?.model_url===good.json.model_url,
 "Admin model list not updated");
const detail=await api("products/"+slug);
check(detail.status===200&&detail.json.colors?.find(x=>x.name==="Kem")?.model_url===good.json.model_url,
 "Public product detail lost model URL");
const model=await fetch(origin+good.json.model_url);
const modelBytes=Buffer.from(await model.arrayBuffer());
if(model.status!==200||model.headers.get("content-type")!=="model/gltf-binary"||
 modelBytes.subarray(0,4).toString()!=="glTF"){
 const direct=await fetch("http://127.0.0.1:8081/api/v1/models/"+good.json.model_url.split("/").pop());
 console.error("3D file diagnostic",{
  url:good.json.model_url,webStatus:model.status,webContentType:model.headers.get("content-type"),
  webFirstBytes:modelBytes.subarray(0,12).toString(),
  apiStatus:direct.status,apiContentType:direct.headers.get("content-type")
 });
 throw Error("Model proxy does not serve binary GLB");
}
const rejected=await fetch(origin+"/models/../../etc/passwd");
check(rejected.status!==200,"Model router accepted unsafe path");
const unlinked=await api("admin/products/"+productId+"/models",{method:"DELETE",cookie,body:{color:"Kem"}});
check(unlinked.status===200,"Failed to unlink model");
const after=await api("products/"+slug);
check(after.status===200&&after.json.colors?.find(x=>x.name==="Kem")?.model_url==="",
 "Removing GLB link must not affect the photo catalog");
check(after.json.variants?.some(v=>v.color==="Kem"&&v.size==="M"&&v.available===3),
 "Unlinking GLB must not modify the SKU or inventory");
console.log("3D MODEL BFF E2E PASSED: Admin GLB upload, external URI denial, public model, color mapping, unlink and SKU safety.");

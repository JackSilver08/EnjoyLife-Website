// Browser interaction regression: uses system Chrome via CDP and disposable Docker DB.
import {spawn,execFileSync} from "node:child_process";
import {mkdtempSync,readFileSync,rmSync,existsSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
const origin="http://127.0.0.1:3000"; // Host-to-Docker BFF
const browserOrigin="http://localhost:3000"; // Next.js dev allows localhost JS/HMR
const assert=(v,msg)=>{if(!v)throw Error(msg)};
const delay=n=>new Promise(r=>setTimeout(r,n));
async function api(path,method="GET",cookie="",body){
 const res=await fetch(origin+"/api/store/"+path,{method,headers:{
  ...(cookie?{Cookie:cookie}:{}),...(method!=="GET"?{"Content-Type":"application/json",Origin:origin,"Sec-Fetch-Site":"same-origin"}:{})
 },...(method!=="GET"?{body:JSON.stringify(body||{})}:{})});
 const text=await res.text();let data;try{data=JSON.parse(text)}catch{data=null}
 return {status:res.status,data,text,cookie:res.headers.get("set-cookie")?.split(";")[0]||""};
}
const auth=await api("auth/admin-demo","POST","",{username:"admin",password:"admin"});
assert(auth.status===200&&auth.cookie,"Cannot login: "+auth.text);
const cookie=auth.cookie;
const slug="ci-editor-"+Date.now().toString(36);
const product=await api("admin/products","POST",cookie,{
 name:"Variant Price Regression Fixture",slug,description:"Admin edit UI test",category:"ao",
 color:"Be",size:"M",price_vnd:389000,opening_stock:2,published:false
});
assert(product.status===201&&product.data?.variant_id,"Cannot create test product: "+product.text);
const variantId=product.data.variant_id;
const name=["google-chrome","google-chrome-stable","chromium","chromium-browser"].find(x=>{
 try{return !!execFileSync("which",[x],{stdio:"pipe"}).length}catch{return false}
});
assert(name,"Chrome/Chromium not installed in CI runner");
const dir=mkdtempSync(join(tmpdir(),"enjoy-chrome-"));
const chrome=spawn(name,["--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
 "--no-first-run","--remote-allow-origins=*","--remote-debugging-port=0","--user-data-dir="+dir,"about:blank"],{stdio:["ignore","ignore","pipe"]});
let chromeErrors="";chrome.stderr.on("data",chunk=>{chromeErrors+=String(chunk).slice(0,2000)});
let ws;
function cleanup(){try{ws?.close()}catch{}try{chrome.kill("SIGKILL")}catch{}try{rmSync(dir,{recursive:true,force:true})}catch{}}
process.on("exit",cleanup);
let port=0;
for(let i=0;i<120;i++){
 if(chrome.exitCode!==null||chrome.signalCode!==null)throw Error("Chrome failed to start: "+chromeErrors.slice(-1300));
 if(existsSync(join(dir,"DevToolsActivePort"))){port=Number(readFileSync(join(dir,"DevToolsActivePort"),"utf8").split("\n")[0]);break}
 await delay(150);
}
assert(port>0,"Chrome debug port missing; browser="+name+"; "+chromeErrors.slice(-1600));
const targets=await(await fetch("http://127.0.0.1:"+port+"/json/list")).json();
const page=targets.find(x=>x.type==="page");
assert(page?.webSocketDebuggerUrl,"No Chrome debugging tab");
ws=new WebSocket(page.webSocketDebuggerUrl);
await new Promise((ok,bad)=>{ws.addEventListener("open",ok,{once:true});ws.addEventListener("error",bad,{once:true})});
const pending=new Map();let id=0,patchCount=0;
ws.addEventListener("message",ev=>{
 const msg=JSON.parse(String(ev.data));
 if(msg.method==="Network.requestWillBeSent"&&msg.params?.request?.method==="PATCH"
  &&msg.params.request.url.includes("/api/store/admin/variants/"+variantId))patchCount++;
 if(msg.id&&pending.has(msg.id)){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.bad(Error(msg.error.message)):p.ok(msg.result)}
});
function call(method,params={}){return new Promise((ok,bad)=>{const seq=++id;pending.set(seq,{ok,bad});ws.send(JSON.stringify({id:seq,method,params}))})}
async function run(js){const r=await call("Runtime.evaluate",{expression:js,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error("Browser JS exception: "+JSON.stringify(r.exceptionDetails));return r.result.value}
async function until(js,label,seconds=30){const end=Date.now()+seconds*1000;while(Date.now()<end){if(await run(js))return;await delay(300)}throw Error("Browser condition not met: "+label)}
try{
 await call("Page.enable");await call("Runtime.enable");await call("Network.enable");
 const [cn,cv]=cookie.split("=");
 await call("Network.setCookie",{name:cn,value:cv,url:browserOrigin,httpOnly:true,sameSite:"Lax"});
 await call("Page.navigate",{url:browserOrigin+"/admin/products?edit="+product.data.id});
 try{
  await until('document.querySelector(".admin-variants .admin-table tbody button")!==null',"variants loaded");
 }catch(err){
  const debug=await run('({url:location.href,title:document.title,body:document.body?.innerText?.slice(0,600)||""})()');
  throw Error(String(err)+" page="+JSON.stringify(debug));
 }
 const editClicked=await run('(()=>{const b=[...document.querySelectorAll(".admin-variants button")].find(x=>x.textContent.trim()==="Chỉnh sửa");if(!b)return false;b.click();return true})()');
 assert(editClicked,"Cannot find edit button");
 await until('document.querySelector(".admin-variant-editor")!==null',"edit area opened");
 assert(await run('document.querySelectorAll("dialog.admin-modal[open]").length===2'),"Variant edit should use a nested native modal over product editor");
 await delay(1100);
 assert(await run('!!document.querySelector(".admin-variant-editor")'),"Edit panel vanished after initial render");
 assert(patchCount===0,"Clicking Edit automatically PATCHed the price!");
 const before=await api("admin/products/"+product.data.id+"/variants","GET",cookie);
 assert(before.data?.items?.find(x=>x.id===variantId)?.price_vnd===389000,"Price changed without Save");
 const changed=await run('(()=>{const p=document.querySelector(".admin-variant-editor");const el=[...p.querySelectorAll("label")].find(x=>x.textContent.includes("Giá bán"))?.querySelector("input");if(!el)return false;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(el,"412000");el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));return true})()');
 assert(changed,"Price input not found");
 await delay(400);
 assert(await run('!!document.querySelector(".admin-variant-editor")'),"Typing closed the editor");
 assert(patchCount===0,"Typing price auto-saved it");
 const save=await run('(()=>{const b=[...document.querySelectorAll(".admin-variant-editor-actions button")].find(x=>x.textContent.includes("LƯU THAY ĐỔI"));if(!b)return false;b.click();return true})()');
 assert(save,"Explicit Save missing");
 await until('!document.querySelector(".admin-variant-editor")',"save completes",15);
 const after=await api("admin/products/"+product.data.id+"/variants","GET",cookie);
 assert(after.data?.items?.find(x=>x.id===variantId)?.price_vnd===412000,"Save did not persist price; "+after.text);
 assert(patchCount===1,"Expected one explicit PATCH, observed "+patchCount);

 // Ensure the nested size/price modal disappeared, leaving its product editor.
 await until('document.querySelectorAll("dialog.admin-modal[open]").length===1',"variant modal closes, parent remains",12);
 await until('!!document.querySelector(".admin-toast")',"global toast appears after saving",10);
 assert(await run('document.querySelector(".admin-toast")?.textContent?.includes("Đã cập nhật")'),"Success notification is not visible as a popup");
 // Close product modal without persisting another edit.
 await run('document.querySelector("dialog.admin-modal[open] .admin-modal-close").click()');
 await until('document.querySelectorAll("dialog.admin-modal[open]").length===0',"product modal close");
 // A new product form must open as a large modal, not expand into the table.
 await run('(()=>{const b=[...document.querySelectorAll(".admin-toolbar button")].find(x=>x.textContent.includes("Thêm sản phẩm"));if(b)b.click()})()');
 await until('!!document.querySelector("dialog.admin-modal[open] .admin-product-create")',"new product creation modal");
 assert(await run('document.querySelector(".admin-modal-sheet")?.getBoundingClientRect().width>650'),"Large desktop modal is too narrow");
 await call("Input.dispatchKeyEvent",{type:"keyDown",key:"Escape",code:"Escape",windowsVirtualKeyCode:27});
 await call("Input.dispatchKeyEvent",{type:"keyUp",key:"Escape",code:"Escape",windowsVirtualKeyCode:27});
 await until('document.querySelectorAll("dialog.admin-modal[open]").length===0',"Escape closes unsaved new product");
 // Inventory adjustments also open modal, and cancelling must not create a transaction.
 await call("Page.navigate",{url:browserOrigin+"/admin/inventory"});
 await until('document.querySelector(".inventory-actions button")!==null',"stock table loaded");
 const invClicked=await run('(()=>{const b=document.querySelector(".inventory-actions button");if(!b)return false;b.click();return true})()');
 assert(invClicked,"Cannot open stock operation");
 await until('!!document.querySelector("dialog.admin-modal[open] .inventory-operation-form")',"inventory form modal");
 assert(await run('!!document.querySelector("dialog.admin-modal[open] .admin-modal-close")'),"Inventory modal has accessible close button");
 await run('document.querySelector("dialog.admin-modal[open] .admin-modal-close").click()');
 await until('document.querySelectorAll("dialog.admin-modal[open]").length===0',"stock form dismissal");
 // Create and password-reset staff forms are no longer permanent inline forms.
 await call("Page.navigate",{url:browserOrigin+"/admin/staff"});
 await until('document.querySelector(".admin-toolbar button")!==null',"staff management loaded");
 await run('(()=>{const b=[...document.querySelectorAll(".admin-toolbar button")].find(x=>x.textContent.includes("Thêm nhân viên"));if(b)b.click()})()');
 await until('!!document.querySelector("dialog.admin-modal[open] .sprint7-form")',"staff creation modal");
 await run('document.querySelector("dialog.admin-modal[open] .admin-modal-close").click()');
 await until('document.querySelectorAll("dialog.admin-modal[open]").length===0',"staff form dismissal");
 console.log("ADMIN MODAL/TOAST CHROME E2E PASSED: nested edit, success toast, product add, Escape, inventory modal and staff modal.");
 console.log("Admin variant browser E2E PASSED: edit stays open, no autosave, deliberate Save updates PostgreSQL.");
}finally{cleanup()}

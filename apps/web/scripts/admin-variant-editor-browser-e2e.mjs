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
async function until(js,label,seconds=30){const end=Date.now()+seconds*1000;while(Date.now()<end){if(await run(js))return;await delay(300)}const debug=await run('({path:location.pathname,heading:document.querySelector("h1")?.textContent,modalCount:document.querySelectorAll("dialog.admin-modal[open]").length,body:document.body?.innerText?.slice(0,450)})()');throw Error("Browser condition not met: "+label+" "+JSON.stringify(debug))}
try{
 await call("Page.enable");await call("Runtime.enable");await call("Network.enable");
 const [cn,cv]=cookie.split("=");
 await call("Network.setCookie",{name:cn,value:cv,url:browserOrigin,httpOnly:true,sameSite:"Lax"});

 // Admin right-flyout regression: five primary links; two full-width sidebar
 // rows that open a separate popup to the RIGHT, never clipped by nav scrolling.
 await call("Page.navigate",{url:browserOrigin+"/admin"});
 await until('location.pathname==="/admin"&&document.querySelectorAll(".admin-nav-primary>a").length===5&&document.querySelectorAll(".admin-flyout-trigger").length===2',
  "AI-first sidebar and two flyout triggers");
 await delay(750);
 const sidebar=await run('(()=>{const nav=document.querySelector(".admin-sidebar-navigation");return {primary:[...nav.querySelectorAll(".admin-nav-primary>a")].map(x=>new URL(x.href).pathname),groups:[...nav.querySelectorAll(".admin-flyout-trigger")].map(x=>x.textContent.trim()),collapsed:[...nav.querySelectorAll(".admin-flyout-trigger")].every(x=>x.getAttribute("aria-expanded")==="false"),active:[...nav.querySelectorAll("a[aria-current=page]")].map(x=>new URL(x.href).pathname)}})()');
 assert(JSON.stringify(sidebar.primary)===JSON.stringify(["/admin","/admin/orders","/admin/products","/admin/inventory","/admin/warehouse/insights"]),"Primary navigation changed: "+JSON.stringify(sidebar));
 assert(sidebar.groups.length===2&&sidebar.groups.some(x=>x.includes("Vận hành"))&&sidebar.groups.some(x=>x.includes("Quản lý khác"))&&sidebar.collapsed&&JSON.stringify(sidebar.active)==='["/admin"]',"Unexpected sidebar groups: "+JSON.stringify(sidebar));
 const openManagement=await run('(()=>{const b=[...document.querySelectorAll("button.admin-flyout-trigger")].find(x=>x.textContent.includes("Quản lý khác"));if(!b)return false;b.click();return true})()');
 assert(openManagement,"Cannot activate Quản lý khác");
 await until('!!document.querySelector(".admin-flyout-panel a[href=\"/admin/reports\"]")&&[...document.querySelectorAll(".admin-flyout-trigger")].some(x=>x.getAttribute("aria-expanded")==="true")',
  "flyout popup opened");
 const flyoutGeometry=await run('(()=>{const sidebar=document.querySelector(".admin-sidebar").getBoundingClientRect(),pop=document.querySelector(".admin-flyout-panel").getBoundingClientRect();return {sidebarRight:sidebar.right,left:pop.left,right:pop.right,top:pop.top,bottom:pop.bottom,viewport:innerWidth,height:innerHeight,links:document.querySelectorAll(".admin-flyout-panel a").length,portal:!document.querySelector(".admin-sidebar .admin-flyout-panel")}})()');
 assert(flyoutGeometry.portal&&flyoutGeometry.left>=flyoutGeometry.sidebarRight&&flyoutGeometry.right<=flyoutGeometry.viewport&&flyoutGeometry.top>=0&&flyoutGeometry.bottom<=flyoutGeometry.height+2&&flyoutGeometry.links===6,
  "Desktop flyout is clipped or not to sidebar right: "+JSON.stringify(flyoutGeometry));
 // Escape closes the menu, then focus goes back to the trigger.
 await call("Input.dispatchKeyEvent",{type:"keyDown",key:"Escape",code:"Escape",windowsVirtualKeyCode:27});
 await call("Input.dispatchKeyEvent",{type:"keyUp",key:"Escape",code:"Escape",windowsVirtualKeyCode:27});
 await until('!document.querySelector(".admin-flyout-panel")',"Escape dismisses flyout");
 assert(await run('document.activeElement?.classList.contains("admin-flyout-trigger")'),"Escape must restore sidebar trigger focus");
 await run('(()=>{const b=[...document.querySelectorAll("button.admin-flyout-trigger")].find(x=>x.textContent.includes("Quản lý khác"));b.click()})()');
 await until('!!document.querySelector(".admin-flyout-panel a[href=\"/admin/reports\"]")',"management popup reopened");
 await run('document.querySelector(\'.admin-flyout-panel a[href="/admin/reports"]\').click()');
 await until('location.pathname==="/admin/reports"&&!!document.querySelector(\'.admin-sidebar .admin-flyout-trigger-active\')',
  "Report navigation keeps group highlighted");
 await until('!document.querySelector(".admin-flyout-panel")',"Group flyout closes after navigation");

 // Narrow viewport fallback: menu must remain inside viewport while both
 // trigger rows stay full-width, not two cramped tiny columns.
 await call("Emulation.setDeviceMetricsOverride",{width:375,height:810,deviceScaleFactor:1,mobile:true});
 await call("Page.navigate",{url:browserOrigin+"/admin"});
 await until('document.querySelectorAll(".admin-flyout-trigger").length===2',"mobile flyout buttons");
 await delay(600);
 const narrowRow=await run('(()=>{const nav=document.querySelector(".admin-nav-groups").getBoundingClientRect(),buttons=[...document.querySelectorAll(".admin-flyout-trigger")].map(x=>x.getBoundingClientRect());return {width:innerWidth,navWidth:nav.width,first:buttons[0].width,second:buttons[1].width,vertical:buttons[1].top>buttons[0].bottom-1}})()');
 assert(narrowRow.vertical&&narrowRow.first>narrowRow.navWidth*.88&&narrowRow.second>narrowRow.navWidth*.88,"Mobile menu triggers should be two stacked rows: "+JSON.stringify(narrowRow));
 await run('document.querySelector(".admin-flyout-trigger").click()');
 await until('!!document.querySelector(".admin-flyout-panel")',"mobile flyout open");
 const mobileGeometry=await run('(()=>{const r=document.querySelector(".admin-flyout-panel").getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,links:document.querySelectorAll(".admin-flyout-link").length}})()');
 assert(mobileGeometry.left>=0&&mobileGeometry.right<=mobileGeometry.width+1&&mobileGeometry.top>=0&&mobileGeometry.bottom<=mobileGeometry.height+1&&mobileGeometry.links===3,"Mobile flyout escapes viewport: "+JSON.stringify(mobileGeometry));
 await run('document.querySelector(".admin-flyout-header button").click()');
 await until('!document.querySelector(".admin-flyout-panel")',"mobile close button works");
 await call("Emulation.clearDeviceMetricsOverride");
 console.log("ADMIN RIGHT FLYOUT E2E PASSED: two full-width rows, right-side popup, clipped-safe portal, ESC, nested navigation, 375px mobile.");
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
 await until('location.pathname==="/admin/inventory"&&document.querySelector(".inventory-actions button")!==null',"stock table loaded");
 const invClicked=await run('(()=>{const b=document.querySelector(".inventory-actions button");if(!b)return false;b.click();return true})()');
 assert(invClicked,"Cannot open stock operation");
 await until('!!document.querySelector("dialog.admin-modal[open] .inventory-operation-form")',"inventory form modal");
 assert(await run('!!document.querySelector("dialog.admin-modal[open] .admin-modal-close")'),"Inventory modal has accessible close button");
 await run('document.querySelector("dialog.admin-modal[open] .admin-modal-close").click()');
 await until('document.querySelectorAll("dialog.admin-modal[open]").length===0',"stock form dismissal");
 // Create and password-reset staff forms are no longer permanent inline forms.
 await call("Page.navigate",{url:browserOrigin+"/admin/staff"});
 await until('location.pathname==="/admin/staff"&&[...document.querySelectorAll(".admin-toolbar button")].some(x=>x.textContent.includes("Thêm nhân viên"))',"staff management loaded");
 await until('!document.body.innerText.includes("Đang tải...")',"staff React data hydration");
 await delay(250);
 await run('(()=>{const b=[...document.querySelectorAll(".admin-toolbar button")].find(x=>x.textContent.includes("Thêm nhân viên"));if(b)b.click()})()');
 await until('!!document.querySelector("dialog.admin-modal[open] .sprint7-form")',"staff creation modal");
 await run('document.querySelector("dialog.admin-modal[open] .admin-modal-close").click()');
 await until('document.querySelectorAll("dialog.admin-modal[open]").length===0',"staff form dismissal");
 // New Journal articles use a fully sized editor dialog instead of navigating
 // away from the management list.
 await call("Page.navigate",{url:browserOrigin+"/admin/blog"});
 await until('location.pathname==="/admin/blog"&&[...document.querySelectorAll("button")].some(x=>x.textContent.includes("Viết bài mới"))',"Journal dashboard");
 await until('!document.body.innerText.includes("Đang tải bài viết")',"Journal React data hydration");
 const blogOpened=await run('(()=>{const b=[...document.querySelectorAll("button")].find(x=>x.textContent.includes("Viết bài mới"));if(!b)return false;b.click();return true})()');
 assert(blogOpened,"Cannot open Journal creation modal");
 await until('!!document.querySelector("dialog.admin-modal[open] .cms-page")',"Journal rich-text editor modal");
 await run('document.querySelector("dialog.admin-modal[open] .admin-modal-close").click()');
 await until('document.querySelectorAll("dialog.admin-modal[open]").length===0',"Journal modal close");
 // Procurement forms must be actionable from large popups as well.
 await call("Page.navigate",{url:browserOrigin+"/admin/warehouse"});
 await until('location.pathname==="/admin/warehouse"&&[...document.querySelectorAll("button")].some(x=>x.textContent.trim()==="+ Nhà cung cấp")',"warehouse page");
 await until('!document.body.innerText.includes("Đang tải phiếu")',"warehouse React data hydration");
 const supplierOpened=await run('(()=>{const b=[...document.querySelectorAll("button")].find(x=>x.textContent.trim()==="+ Nhà cung cấp");if(!b)return false;b.click();return true})()');
 assert(supplierOpened,"Warehouse supplier modal opener missing");
 await until('!!document.querySelector("dialog.admin-modal[open] form.warehouse-form")',"supplier form modal");
 await run('document.querySelector("dialog.admin-modal[open] .admin-modal-close").click()');
 await until('document.querySelectorAll("dialog.admin-modal[open]").length===0',"supplier modal dismisses");
 // A customer's /account route renders the shared password form OUTSIDE the
 // protected Admin shell. This used to crash with "useAdminToast must be used
 // inside AdminToastProvider" when redirected from an unauthorized /admin.
 const customer=await api("auth/register","POST","",{
  name:"CI Account Toast Regression",
  email:"ci-account-toast-"+Date.now()+"@example.test",
  password:"CiAccountPassword123!"
 });
 assert(customer.status===200&&customer.cookie.startsWith("enjoy_life_session="),
  "Could not create isolated customer account: "+customer.text);
 const [customerCookieName,customerCookieValue]=customer.cookie.split("=");
 await call("Network.setCookie",{
  name:customerCookieName,value:customerCookieValue,url:browserOrigin,
  httpOnly:true,sameSite:"Lax"
 });
 await call("Page.navigate",{url:browserOrigin+"/account"});
 await until('location.pathname==="/account"&&!!document.querySelector(".sprint7-password-form")',
  "customer account password form renders without AdminToastProvider",20);
 const publicForm=await run('({notice:!!document.querySelector(".sprint7-password-form"),account:document.body?.innerText?.includes("Bảo mật tài khoản"),overlay:!!document.querySelector("nextjs-portal")?.shadowRoot?.textContent?.includes("useAdminToast must be used inside")})');
 assert(publicForm.notice&&publicForm.account&&!publicForm.overlay,
  "Account page crashed while rendering password form outside provider: "+JSON.stringify(publicForm));
 await call("Page.navigate",{url:browserOrigin+"/admin"});
 await until('location.pathname==="/account"&&!!document.querySelector(".sprint7-password-form")',
  "customer redirected from admin can still view Account page",20);
 const redirectError=await run('!!document.querySelector("nextjs-portal")?.shadowRoot?.textContent?.includes("useAdminToast must be used inside")');
 assert(!redirectError,"Unauthenticated Admin redirect reproduced the toast context crash");
 console.log("ACCOUNT TOAST REGRESSION PASSED: customer account and unauthorized admin redirect render without AdminToastProvider.");
 console.log("ADMIN MODAL/TOAST CHROME E2E PASSED: nested edit, success toast, product add, Escape, inventory modal and staff modal.");
 console.log("Admin variant browser E2E PASSED: edit stays open, no autosave, deliberate Save updates PostgreSQL.");
}finally{cleanup()}

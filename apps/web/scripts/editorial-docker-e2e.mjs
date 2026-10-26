// Sprint 10: real Next.js/Go/PostgreSQL and Chrome responsive homepage tests.
// Runs ONLY with disposable Docker CI database.
import {spawn,execFileSync} from "node:child_process";
import {mkdtempSync,readFileSync,rmSync,existsSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
const origin="http://127.0.0.1:3000",browserOrigin="http://localhost:3000";
const check=(value,message)=>{if(!value)throw Error(message)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function api(path,method="GET",cookie="",body){
 const response=await fetch(origin+"/api/store/"+path,{method,headers:{
  ...(cookie?{Cookie:cookie}:{}),...(method!=="GET"?{"Content-Type":"application/json",Origin:origin,"Sec-Fetch-Site":"same-origin"}:{})
 },...(method!=="GET"?{body:JSON.stringify(body??{})}:{})});
 const text=await response.text();let json;try{json=JSON.parse(text)}catch{json=null}
 return {status:response.status,json,text,cookie:response.headers.get("set-cookie")?.split(";")[0]??""};
}
const login=await api("auth/admin-demo","POST","",{username:"admin",password:"admin"});
check(login.status===200&&login.cookie,"Cannot obtain isolated CI admin session");
const cookie=login.cookie;
const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7vGZ0AAAAASUVORK5CYII=","base64");
const fileForm=new FormData();fileForm.set("file",new Blob([png],{type:"image/png"}),"editorial-ci.png");
const upload=await fetch(origin+"/api/store/admin/media",{method:"POST",headers:{
 Cookie:cookie,Origin:origin,"Sec-Fetch-Site":"same-origin"},body:fileForm});
const uploaded=await upload.json().catch(()=>null);
check(upload.status===201&&/^\/media\/[a-f0-9-]+\.png$/.test(uploaded?.url),"Could not upload product photo test fixture");
const prefix="editorial-ci-"+Date.now().toString(36);
const ids=[];
for(let n=1;n<=6;n++){
 const slug=prefix+"-"+n;
 const created=await api("admin/products","POST",cookie,{
  name:n===5?"Long fashion name ".repeat(7):"Sprint 10 Outfit "+n,
  slug,category:"ao",color:"Trắng",size:"M",price_vnd:120000+n*17000,
  opening_stock:n===5?0:3,image_url:n%2===1?uploaded.url:"",published:true
 });
 check(created.status===201&&created.json?.id,"Cannot create product fixture "+n+": "+created.text);
 ids.push(slug);
}
const draft=await api("admin/products","POST",cookie,{
 name:"Draft item should be hidden",slug:prefix+"-draft",category:"ao",color:"Đen",size:"M",
 price_vnd:220000,opening_stock:1,published:false
});
check(draft.status===201,"Draft fixture could not be created");
const catalog=await api("products");
check(catalog.status===200&&Array.isArray(catalog.json?.items),"Published products unavailable");
const topFive=catalog.json.items.slice(0,5);
check(topFive.length===5&&topFive.every(x=>x.slug.startsWith(prefix+"-")&&x.slug!==prefix+"-draft"),
 "Wrong newest-public data: "+topFive.map(x=>x.slug).join(","));
check(!topFive.some(x=>x.slug===ids[0]),"Sixth product should not be shown in homepage");
const binary=["google-chrome","google-chrome-stable","chromium","chromium-browser"].find(x=>{
 try{return execFileSync("which",[x],{encoding:"utf8"}).trim().length>0}catch{return false}
});
check(binary,"Chrome/Chromium not installed in GitHub runner");
const directory=mkdtempSync(join(tmpdir(),"editorial-chrome-"));
const chrome=spawn(binary,["--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
 "--no-first-run","--remote-allow-origins=*","--remote-debugging-port=0",
 "--user-data-dir="+directory,"about:blank"],{stdio:["ignore","ignore","pipe"]});
let stderr="";chrome.stderr.on("data",chunk=>{stderr+=String(chunk).slice(0,1200)});
let ws;
function cleanup(){try{ws?.close()}catch{}try{chrome.kill("SIGKILL")}catch{}try{rmSync(directory,{recursive:true,force:true})}catch{}}
process.on("exit",cleanup);
let port=0;
for(let i=0;i<120;i++){
 if(chrome.exitCode!==null||chrome.signalCode!==null)throw Error("Chrome crashed "+stderr.slice(-1400));
 if(existsSync(join(directory,"DevToolsActivePort"))){
  port=Number(readFileSync(join(directory,"DevToolsActivePort"),"utf8").split("\n")[0]);break
 }
 await sleep(150);
}
check(port>0,"Chrome debug port unavailable: "+stderr.slice(-1400));
const tabs=await(await fetch("http://127.0.0.1:"+port+"/json/list")).json();
const tab=tabs.find(x=>x.type==="page");
check(tab?.webSocketDebuggerUrl,"Chrome page missing");
ws=new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((ok,bad)=>{ws.addEventListener("open",ok,{once:true});ws.addEventListener("error",bad,{once:true})});
let seq=0;const pending=new Map();
ws.addEventListener("message",event=>{
 const msg=JSON.parse(String(event.data));
 if(msg.id&&pending.has(msg.id)){
  const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.bad(Error(msg.error.message)):p.ok(msg.result)
 }
});
function command(method,params={}){
 return new Promise((ok,bad)=>{let id=++seq;pending.set(id,{ok,bad});ws.send(JSON.stringify({id,method,params}))})
}
async function evaluate(expression){
 const result=await command("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
 if(result.exceptionDetails)throw Error("Browser exception: "+JSON.stringify(result.exceptionDetails));
 return result.result.value;
}
async function until(expression,label){
 for(let i=0;i<110;i++){if(await evaluate(expression))return;await sleep(300)}
 throw Error("Browser did not render "+label+"; "+JSON.stringify(await evaluate("({url:location.href,body:document.body?.innerText?.slice(0,400)})")));
}
const measure="(()=>{"+
 "const h=document.querySelector('#featured-products');"+
 "const cards=[...h.querySelectorAll('.latest-editorial-item')];"+
 "const grid=h.querySelector('.latest-editorial-grid');"+
 "return {width:innerWidth,hostRight:h.getBoundingClientRect().right,"+
 "columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,"+
 "hrefs:cards.map(x=>new URL(x.href).pathname),"+
 "rects:cards.map(x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}),"+
 "images:cards.filter(x=>x.querySelector('img')).length,"+
 "placeholders:h.querySelectorAll('.latest-editorial-placeholder').length,"+
 "soldOut:h.querySelectorAll('.latest-editorial-sold-out').length,"+
 "names:h.querySelectorAll('.latest-editorial-info h3').length,"+
 "prices:h.querySelectorAll('.latest-editorial-price').length};"+
 "})()";
try{
 await command("Page.enable");await command("Runtime.enable");
 for(const width of [1440,768,375,320]){
  await command("Emulation.setDeviceMetricsOverride",{width,height:900,deviceScaleFactor:1,mobile:width<=375});
  await command("Page.navigate",{url:browserOrigin+"/"});
  await until("document.querySelectorAll('#featured-products .latest-editorial-item').length===5","five product cards "+width);
  // Next.js dev can stream the server-rendered card HTML before its CSS
  // chunks finish loading. Do not measure the unstyled one-column flash.
  const expectedColumns=width>=1024?3:2;
  await until("(()=>{const g=document.querySelector('.latest-editorial-grid');return g&&getComputedStyle(g).display==='grid'&&getComputedStyle(g).gridTemplateColumns.split(' ').length==="+expectedColumns+"})()",
   "editorial stylesheet and grid columns at "+width);
  const r=await evaluate(measure);
  // UI/UX 2.0 is a read-only homepage enhancement. Preserve real product
  // links, responsive usability, anchor navigation and correct listed prices.
  const ux=await evaluate("(()=>{"+
    "const home=document.querySelector('.home-cinematic');"+
    "const nav=document.querySelector('.home-chapters');"+
    "const look=document.querySelector('.home-lookbook');"+
    "const chosen=[...document.querySelectorAll('.home-lookbook-choice')];"+
    "return {statement:!!document.querySelector('.home-brand-statement'),"+
    "signature:!!document.querySelector('.home-closing-signature'),"+
    "chapters:nav?.querySelectorAll('a').length||0,"+
    "navPosition:nav?getComputedStyle(nav).position:'',"+
    "lookbook:!!look,lookCount:chosen.length,"+
    "lookLink:look?.querySelector('.home-lookbook-cta')?.getAttribute('href'),"+
    "lookPrice:look?.querySelector('.home-lookbook-price')?.textContent,"+
    "scrollWidth:document.documentElement.scrollWidth,"+
    "hoverLabels:document.querySelectorAll('.latest-editorial-discover').length,"+
    "images:look?.querySelectorAll('.home-lookbook-choice img').length||0"+
    "}})()");
  const availableLookbook=topFive.filter(p=>p.image_url).slice(0,3);
  check(ux.statement&&ux.signature,"Editorial 2.0 sections missing at "+width);
  check(ux.navPosition==="sticky","Homepage chapter navigation must stay sticky at "+width);
  check(ux.chapters===6,"Expected all six navigation chapters at "+width);
  check(ux.lookbook&&ux.lookCount===availableLookbook.length,"Lookbook must show real product photos at "+width);
  check(ux.lookLink==="/products/"+availableLookbook[0].slug,"Lookbook CTA changed product detail route at "+width);
  check(ux.lookPrice?.length>0,"Lookbook must display real product price");
  check(ux.scrollWidth<=width+1,"Horizontal document overflow at "+width+": "+ux.scrollWidth);
  check(ux.hoverLabels===5,"Product discover affordance missing at "+width);
  if(width===1440&&ux.lookCount>1){
    await until("!!document.querySelector('.home-cinematic.is-cinematic-ready')","UX 2.0 hydration");
    await evaluate("document.querySelectorAll('.home-lookbook-choice')[1].click();true");
    await until("document.querySelector('.home-lookbook-cta')?.getAttribute('href')==='/products/"+availableLookbook[1].slug+"'","lookbook switches to second real product");
    const switched=await evaluate("(()=>{const b=document.querySelectorAll('.home-lookbook-choice');return [b[0].getAttribute('aria-pressed'),b[1].getAttribute('aria-pressed')].join(',')})()");
    check(switched==="false,true","Lookbook choices must expose selection to assistive technology");
    console.log("Editorial UX 2.0 Chrome: real-product lookbook selection, nav and links OK");
  }
  check(r.names===5&&r.prices===5,"Missing titles/prices at "+width);
  check(r.hrefs.every((href,i)=>href==="/products/"+topFive[i].slug),"Product order/link incorrect at "+width+": "+r.hrefs.join(","));
  check(r.rects.every(x=>x.width>95&&x.height>130),"Too small card at "+width+": "+JSON.stringify(r.rects));
  check(r.rects.every(x=>x.x>=-1&&x.x+x.width<=width+1),"Card horizontal overflow at "+width);
  check(r.hostRight<=width+1,"Editorial section overflow at "+width);
  check(r.images>=1&&r.placeholders>=1&&r.soldOut>=1,"Missing actual image, fallback or stock label at "+width);
  if(width>=1024){
   check(r.columns===3,"Desktop needs three columns");
   check(r.rects[0].height>r.rects[1].height*1.5,"Hero must span two desktop rows");
  }else{
   check(r.columns===2,"Tablet/mobile needs two supporting columns");
   check(r.rects[0].width>r.rects[1].width*1.8,"Mobile hero must span both columns");
   check(r.rects[0].y<r.rects[1].y,"Main product must appear before supporting products");
  }
  if(width===1440){
   await until("!!document.querySelector('.home-cinematic.is-cinematic-ready')","cinematic scroll controller");
   const heroImage=".hero-photo";
   const startY=await evaluate("parseFloat(document.querySelector('"+heroImage+"').style.getPropertyValue('--cinematic-hero-image-y')) || 0");
   await evaluate("document.documentElement.style.scrollBehavior='auto';window.scrollTo({top:420,behavior:'instant'});true");
   await sleep(350);
   const movedY=await evaluate("parseFloat(document.querySelector('"+heroImage+"').style.getPropertyValue('--cinematic-hero-image-y')) || 0");
   check(movedY>startY+20,"Hero parallax does not respond to scrolling: "+startY+" -> "+movedY);
   const storyTop=await evaluate("scrollY+document.querySelector('.home-story').getBoundingClientRect().top");
   await evaluate("window.scrollTo({top:"+Math.max(0,Math.floor(storyTop)+200)+",behavior:'instant'});true");
   await until("!!document.querySelector('.home-story-photo-inner')?.style.getPropertyValue('--cinematic-story-photo-y')","story image parallax movement");
   const productTop=await evaluate("scrollY+document.querySelector('#featured-products').getBoundingClientRect().top");
   await evaluate("window.scrollTo({top:"+Math.max(0,Math.floor(productTop)-110)+",behavior:'instant'});true");
   await until("document.querySelectorAll('.latest-editorial-item[data-cinematic-revealed]').length>=1","scroll-triggered product reveal");
   await command("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
   await until("!document.querySelector('.home-cinematic.is-cinematic-ready')","reduced-motion opt out");
   const accessible=await evaluate("(()=>{const card=document.querySelector('.latest-editorial-item');return {opacity:getComputedStyle(card).opacity,href:card.href}})()");
   check(accessible.opacity==="1"&&accessible.href.includes("/products/"),"Reduce Motion must keep product links fully visible");
   await command("Emulation.setEmulatedMedia",{features:[]});
   await until("!!document.querySelector('.home-cinematic.is-cinematic-ready')","resume cinematic motion");
   await evaluate("window.scrollTo({top:0,behavior:'instant'});true");
   console.log("Cinematic parallax Chrome E2E: hero, story, card reveals, Reduce Motion OK");
  }
  console.log("Editorial layout "+width+"px: OK");
 }
 const detail=await evaluate("document.querySelector('#featured-products .latest-editorial-item').href");
 await command("Page.navigate",{url:detail});
 await until("document.querySelector('main')?.innerText?.includes('Sprint 10')","product detail navigation");
 console.log("SPRINT10 BROWSER E2E PASSED: newest five, draft excluded, product detail link, responsive grid, stock status, image fallback.");
}finally{cleanup()}

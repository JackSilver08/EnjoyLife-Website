const base="http://127.0.0.1:3399";
const route=base+"/api/store/auth/login";
let ready=false;
for(let i=0;i<60;i++){
 try{await fetch(base+"/api/store/auth/me");ready=true;break;}catch{await new Promise(resolve=>setTimeout(resolve,500));}
}
if(!ready)throw Error("Next.js server did not start");
const run=async(origin,site)=>{
 const res=await fetch(route,{method:"POST",headers:{"Content-Type":"application/json","Origin":origin,"Sec-Fetch-Site":site},body:JSON.stringify({email:"invalid@example.com",password:"wrong"})});
 return {status:res.status,body:await res.text()};
};
const same=await run(base,"same-origin");
if(same.status===403)throw Error("Valid localhost request rejected: "+same.body);
const other=await run("https://attacker.invalid","cross-site");
if(other.status!==403)throw Error("Cross-site request was not rejected: "+other.status);
const forged=await run("https://attacker.invalid","same-origin");
if(forged.status!==403)throw Error("Forged same-origin metadata bypassed Origin host check");
console.log("Origin smoke checks passed; localhost status="+same.status+", attacker status="+other.status);

const page=async(path)=>{
 const response=await fetch(base+path);
 if(!response.ok)throw Error("Route "+path+" returned "+response.status);
 return response.text();
};
const homepage=await page("/");
const sections=["our-story","featured-products","journal","contact"];
let cursor=-1;
for(const id of sections){
 const found=homepage.indexOf('id="'+id+'"');
 if(found<=cursor)throw Error("Homepage missing or out of order section: "+id);
 cursor=found;
}
if(!homepage.includes('href="#our-story"'))throw Error("Hero is not linked to story section");
if(homepage.includes('id="lookbook"')||homepage.includes('id="shop-category"'))throw Error("Retired homepage sections are still rendered");
const blog=await page("/blog");
if(!blog.includes("CHỦ ĐỀ DỰ KIẾN"))throw Error("Journal needs explicit unpublished content labels");
const contact=await page("/contact");
if(!contact.includes("LIÊN HỆ"))throw Error("Contact page content missing");
console.log("Homepage story/product/journal/contact and supporting routes passed");

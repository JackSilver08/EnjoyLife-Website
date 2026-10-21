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
// Only check actual rendered sections, not serialized scripts embedded in Next.js HTML.
if(/<section\\b[^>]*\\bid="(?:lookbook|shop-category)"/i.test(homepage))throw Error("Retired homepage sections are still rendered");
const blog=await page("/blog");
if(!blog.includes("CHỦ ĐỀ DỰ KIẾN"))throw Error("Journal needs explicit unpublished content labels");
const contact=await page("/contact");
if(!contact.includes("LIÊN HỆ"))throw Error("Contact page content missing");
console.log("Homepage story/product/journal/contact and supporting routes passed");

const protectedPage=await fetch(base+"/admin/blog",{redirect:"manual"});
if(![303,307,308].includes(protectedPage.status)||!String(protectedPage.headers.get("location")).includes("/account"))
  throw Error("Admin Journal route must redirect unauthenticated visitors to /account");
for(const path of ["/admin/blog/new","/admin/blog/123e4567-e89b-12d3-a456-426614174000/edit"]){
 const res=await fetch(base+path,{redirect:"manual"});
 if(![303,307,308].includes(res.status)||!String(res.headers.get("location")).includes("/account"))
  throw Error("Editor route is not protected: "+path);
}
const articleId="123e4567-e89b-12d3-a456-426614174000";
for(const [method,path] of [
 ["GET","admin/blog/articles"],
 ["GET","admin/blog/articles/"+articleId],
 ["POST","admin/blog/articles"],
 ["PUT","admin/blog/articles/"+articleId],
 ["PATCH","admin/blog/articles/"+articleId+"/status"],
 ["DELETE","admin/blog/articles/"+articleId],
 ["POST","admin/blog/categories"],
 ["POST","admin/blog/tags"]
]){
 const res=await fetch(base+"/api/store/"+path,{method,headers:{"Content-Type":"application/json","Origin":base,"Sec-Fetch-Site":"same-origin"},...(method==="GET"?{}:{body:JSON.stringify({expected_version:1})})});
 if(res.status===404||res.status===403)throw Error("Allowed CMS route missing or origin rejected: "+method+" "+path+" "+res.status);
 if(method!=="GET"){
  const csrf=await fetch(base+"/api/store/"+path,{method,headers:{"Content-Type":"application/json","Origin":"https://attacker.invalid","Sec-Fetch-Site":"cross-site"},body:"{}"});
  if(csrf.status!==403)throw Error("Cross-origin CMS mutation accepted: "+method+" "+path);
 }
}
console.log("Admin CMS routes, access guard and CSRF smoke checks passed");

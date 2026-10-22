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

if(!blog.includes("Bài viết kiểm thử Sprint 4"))throw Error("Published API article not displayed on /blog");
if(blog.includes("CHỦ ĐỀ DỰ KIẾN"))throw Error("Hardcoded Journal preview still rendered");
if(!homepage.includes("Bài viết kiểm thử Sprint 4"))throw Error("Homepage Journal is not dynamically populated");
const article=await page("/blog/sprint-4-test-article");
for(const fragment of ["Bài viết kiểm thử Sprint 4","Nội dung từ API","Chi tiết bài viết thực sự lấy từ API","BlogPosting","SEO Description kiểm thử"]){
 if(!article.includes(fragment))throw Error("Article detail missing "+fragment);
}
if(!article.includes('rel="canonical"')||!article.includes("sprint-4-test-article"))throw Error("Canonical article URL missing");
if(!article.includes('property="og:type"'))throw Error("OpenGraph metadata missing");
const unpublished=await fetch(base+"/blog/draft-should-never-appear");
if(unpublished.status!==404)throw Error("Draft/unpublished detail should return HTTP 404, got "+unpublished.status);
const filtered=await page("/blog?category=phong-cach&tag=toi-gian");
if(!filtered.includes("Bài viết kiểm thử Sprint 4"))throw Error("Category+tag filters failed");
const emptyFiltered=await page("/blog?category=khong-ton-tai");
if(emptyFiltered.includes("Bài viết kiểm thử Sprint 4"))throw Error("Filtered feed showed irrelevant article");
const robot=await page("/robots.txt");
if(!robot.includes("Disallow: /admin/"))throw Error("Production robots guard missing");
const sitemap=await page("/sitemap.xml");
if(!sitemap.includes("https://enjoylife.example.com/blog/sprint-4-test-article"))throw Error("Published blog URL missing from sitemap");
if(sitemap.includes("draft-should-never-appear"))throw Error("Unpublished slug leaked to sitemap");

// Contact form is shown on the homepage (no extra navigation required).
for(const fragment of [
  'id="enjoy-contact-form"',
  'action="https://formspree.io/f/meaeydne"',
  'name="name"',
  'name="email"',
  'name="topic"',
  'name="message"',
  'name="_gotcha"',
  'GỬI LỜI NHẮN',
]){
 if(!homepage.includes(fragment))throw Error("Inline contact form missing "+fragment);
}
if(homepage.includes("THÔNG TIN LIÊN HỆ"))throw Error("Legacy contact button remains on homepage");
if(!homepage.includes('href="/#contact"'))throw Error("Footer no longer links to the inline contact section");
// Preserve old bookmarks but remove the standalone contact content page.
const legacyContact=await fetch(base+"/contact",{redirect:"manual"});
if(![301,302,303,307,308].includes(legacyContact.status)||!String(legacyContact.headers.get("location")).includes("/#contact"))
 throw Error("Legacy contact page must redirect to homepage form; got "+legacyContact.status);
console.log("Homepage story/product/journal and Formspree inline contact verified");

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

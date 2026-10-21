// Runs against the ephemeral CI Docker Compose stack, never a user's production DB.
const origin="http://127.0.0.1:3000";
async function call(path,{method="GET",cookie="",body}={}){
 const response=await fetch(origin+path,{
  method,
  headers:{"Accept":"application/json",...(cookie?{Cookie:cookie}:{}),
   ...(body?{"Content-Type":"application/json",Origin:origin,"Sec-Fetch-Site":"same-origin"}:{})},
  ...(body?{body:JSON.stringify(body)}:{}),
 });
 const text=await response.text();
 let json;
 try{json=JSON.parse(text)}catch{json=null}
 return {status:response.status,response,text,json};
}
function ensure(condition,why){if(!condition)throw Error(why)}
const key=String(Date.now());
const slug="sprint4-ci-"+key;
const login=await call("/api/store/auth/admin-demo",{method:"POST",body:{username:"admin",password:"admin"}});
ensure(login.status===200,"Admin login failed "+login.status+" "+login.text);
const cookie=login.response.headers.get("set-cookie")?.split(";")[0];
ensure(cookie?.includes("="),"Missing session cookie");
// Sprint 5: real multipart upload through Next BFF into Go/volume storage.
const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7vGZ0AAAAASUVORK5CYII=","base64");
const form=new FormData();form.set("file",new Blob([png],{type:"image/png"}),"sprint5-test.png");
const upload=await fetch(origin+"/api/store/admin/media",{method:"POST",headers:{Cookie:cookie,Origin:origin,"Sec-Fetch-Site":"same-origin"},body:form});
const media=await upload.json().catch(()=>null);
ensure(upload.status===201,"Multipart upload failed "+upload.status+" "+JSON.stringify(media));
ensure(/^\/media\/[a-f0-9-]+\.png$/.test(media?.url),"Upload returned invalid media URL "+media?.url);
const image=await fetch(origin+media.url);
ensure(image.status===200,"Media image not served through Next route "+image.status);
ensure(image.headers.get("content-type")?.includes("image/png"),"Media content-type wrong");
ensure((await image.arrayBuffer()).byteLength===png.length,"Media bytes did not roundtrip");
const unauth=await fetch(origin+"/api/store/admin/media");
ensure(unauth.status===401||unauth.status===403,"Media library should require admin session");
const cross=await fetch(origin+"/api/store/admin/media",{method:"POST",headers:{Cookie:cookie,Origin:"https://attacker.invalid","Sec-Fetch-Site":"cross-site"},body:form});
ensure(cross.status===403,"Cross-origin media upload not blocked");
const corrupt=new FormData();corrupt.set("file",new Blob(["script>alert(1)"],{type:"image/png"}),"fake.png");
const bad=await fetch(origin+"/api/store/admin/media",{method:"POST",headers:{Cookie:cookie,Origin:origin,"Sec-Fetch-Site":"same-origin"},body:corrupt});
ensure(bad.status===400,"Non-image upload should be rejected, got "+bad.status);
const site=await call("/api/store/site/content");
ensure(site.status===200&&site.json?.hero_title,"Missing dynamic site content");
const changed={...site.json,hero_image_url:media.url,hero_title:"Hero Sprint 5 test"};
const siteSaved=await call("/api/store/admin/site/content",{method:"PUT",cookie,body:changed});
ensure(siteSaved.status===200,"Admin cannot update Hero "+siteSaved.status+" "+siteSaved.text);
const visible=await call("/");
ensure(visible.status===200&&visible.text.includes("Hero Sprint 5 test"),"Dynamic Homepage Hero content not shown");
ensure(visible.text.includes(media.url),"Uploaded media not used on Homepage");
const restored=await call("/api/store/admin/site/content",{method:"PUT",cookie,body:site.json});
ensure(restored.status===200,"Could not restore site content");
const csvSlug="sprint-5-ci-"+key;
const imp=await call("/api/store/admin/products/import",{method:"POST",cookie,body:{rows:[{
 name:"Sản phẩm mẫu CSV Sprint 5",slug:csvSlug,description:"Sản phẩm thử nghiệm phải ẩn cho đến khi duyệt.",
 category:"ao",collection:"Test",sku:"EL-CI-"+key,color:"Trắng",size:"M",price_vnd:150000,opening_stock:2,
 image_url:media.url,published:true
}]}});
ensure(imp.status===201&&imp.json.created===1,"CSV product import failed: "+imp.status+" "+imp.text);
const products=await call("/api/store/admin/products",{cookie});
const product=products.json?.items?.find(x=>x.slug===csvSlug);
ensure(product&&!product.published&&product.image_url===media.url,"Imported CSV product must be hidden with persisted image; status="+products.status+" payload="+JSON.stringify(products.json)?.slice(0,1800));
ensure(!(await call("/shop")).text.includes(csvSlug),"Hidden imported product appeared in Shop");
console.log("Sprint 5 media & content E2E PASSED: upload -> reject forged files/CSRF -> image roundtrip -> Hero -> CSV hidden import");

const payload={
 title:"Bài kiểm thử trực tiếp từ PostgreSQL",
 slug,
 excerpt:"Bài viết thử nghiệm kiểm tra quá trình xuất bản vào PostgreSQL và hiển thị SSR thực.",
 content_json:{type:"doc",content:[
  {type:"heading",attrs:{level:2},content:[{type:"text",text:"Nội dung thử nghiệm từ database"}]},
  {type:"paragraph",content:[{type:"text",text:"Đoạn bài thử nghiệm xác thực dữ liệu động từ PostgreSQL đến Next.js trong Docker."}]},
 ]},
 category_slug:"",tag_slugs:[],cover_image_url:"",cover_image_alt:"",
 seo_title:"SEO Sprint 4 SQL fixture",seo_description:"Đoạn kiểm thử SEO của bài đã xuất bản.",og_image_url:"",status:"DRAFT",
};
const created=await call("/api/store/admin/blog/articles",{method:"POST",cookie,body:payload});
ensure(created.status===201,"Creating draft failed "+created.status+" "+created.text);
const id=created.json.id;
ensure(id,"New article ID missing");
const hidden=await call("/blog/"+slug);
ensure(hidden.status===404,"Draft exposed to public "+hidden.status);
const before=await call("/blog");
ensure(before.status===200&&!before.text.includes(slug),"Draft leaked into /blog");
const published=await call("/api/store/admin/blog/articles/"+id+"/status",{method:"PATCH",cookie,body:{status:"PUBLISHED",expected_version:1}});
ensure(published.status===200,"Publish API failed "+published.status+" "+published.text);
const detail=await call("/blog/"+slug);
ensure(detail.status===200,"Published article not found on Next.js: "+detail.status);
for(const snippet of [payload.title,"Nội dung thử nghiệm từ database","BlogPosting","SEO Sprint 4 SQL fixture"]){
 ensure(detail.text.includes(snippet),"Missing on published article: "+snippet);
}
const listing=await call("/blog");
ensure(listing.status===200&&listing.text.includes(payload.title),"Published article absent from /blog");
const home=await call("/");
ensure(home.status===200&&home.text.includes(payload.title),"Published article absent from Homepage");
const api=await call("/api/store/blog/articles?limit=9&offset=0");
ensure(api.status===200&&api.json?.items?.some(a=>a.slug===slug),"Public API missing publication");
const robots=await call("/robots.txt");
ensure(robots.text.includes("Disallow: /"),"Local development must stay noindex");
const removed=await call("/api/store/admin/blog/articles/"+id+"/status",{method:"PATCH",cookie,body:{status:"DRAFT",expected_version:2}});
ensure(removed.status===200,"Unpublish failed");
ensure((await call("/blog/"+slug)).status===404,"Unpublished article still publicly available");
ensure(!(await call("/blog")).text.includes(payload.title),"Unpublished article remained on blog index");
console.log("Docker E2E PASSED: Admin draft -> 404 -> publish -> SSR Homepage/blog/article -> unpublish -> 404");

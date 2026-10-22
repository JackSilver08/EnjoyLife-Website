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

const zipFixture=Buffer.from("UEsDBBQAAAgIAGakVV1abPdOPwAAAEQAAAAdAAAAU+G6o24gUGjhuqltL3NwcmludDUtdGVzdC5wbmfrDPBz5+WS4mJgYOD19HAJAtKMIMzBAiS3yvAwASluTxfHkIpbyX/+yzMwMzMxvHsvORcozODp6ueyzimhCQBQSwMEFAAACAgAZqRVXVps904/AAAARAAAACcAAABT4bqjbiBQaOG6qW0vc3ByaW50NS16aXAtYWRkaXRpb25hbC5wbmfrDPBz5+WS4mJgYOD19HAJAtKMIMzBAiS3yvAwASluTxfHkIpbyX/+yzMwMzMxvHsvORcozODp6ueyzimhCQBQSwMEFAAAAAgAZqRVXaIsw5gJAAAABwAAAAwAAABndWlkYW5jZS5jc3ZL1EniMtQxAgBQSwECFAMUAAAICABmpFVdWmz3Tj8AAABEAAAAHQAAAAAAAAAAAAAAgAEAAAAAU+G6o24gUGjhuqltL3NwcmludDUtdGVzdC5wbmdQSwECFAMUAAAICABmpFVdWmz3Tj8AAABEAAAAJwAAAAAAAAAAAAAAgAF6AAAAU+G6o24gUGjhuqltL3NwcmludDUtemlwLWFkZGl0aW9uYWwucG5nUEsBAhQDFAAAAAgAZqRVXaIsw5gJAAAABwAAAAwAAAAAAAAAAAAAAIAB/gAAAGd1aWRhbmNlLmNzdlBLBQYAAAAAAwADANoAAAAxAQAAAAA=","base64");
const zipData=new FormData();zipData.set("file",new Blob([zipFixture],{type:"application/zip"}),"Sản Phẩm.zip");
const zipResult=await fetch(origin+"/api/store/admin/media/bulk",{
 method:"POST",headers:{Cookie:cookie,Origin:origin,"Sec-Fetch-Site":"same-origin"},body:zipData,
});
const summary=await zipResult.json().catch(()=>null);
ensure(zipResult.status===201&&summary?.uploaded===1&&summary?.skipped_existing===1&&summary?.total===2,
 "ZIP media intake: "+zipResult.status+" "+JSON.stringify(summary));
const mediaList=await call("/api/store/admin/media",{cookie});
ensure(mediaList.status===200&&mediaList.json?.items?.some(m=>m.original_name==="sprint5-zip-additional.png"),
 "ZIP image was not persisted and matched by original filename.");
const duplicateZip=await fetch(origin+"/api/store/admin/media/bulk",{
 method:"POST",headers:{Cookie:cookie,Origin:origin,"Sec-Fetch-Site":"same-origin"},body:zipData,
});
const duplicateResult=await duplicateZip.json().catch(()=>null);
ensure(duplicateZip.status===201&&duplicateResult?.uploaded===0&&duplicateResult?.skipped_existing===2,
 "ZIP reupload should be idempotent: "+JSON.stringify(duplicateResult));
const zipWithoutAdmin=await fetch(origin+"/api/store/admin/media/bulk",{method:"POST",body:zipData});
ensure([401,403].includes(zipWithoutAdmin.status),"Unauthenticated ZIP upload accepted");
const zipCross=await fetch(origin+"/api/store/admin/media/bulk",{method:"POST",
 headers:{Cookie:cookie,Origin:"https://attacker.invalid","Sec-Fetch-Site":"cross-site"},body:zipData,
});
ensure(zipCross.status===403,"Cross-origin ZIP upload accepted");
const invalidZip=new FormData();
invalidZip.set("file",new Blob([Buffer.from("UEsDBBQAAAgIAGakVV3fd10oEAAAABQAAAAYAAAAU+G6o24gUGjhuqltL2Rhbmdlci5odG1ssylOLsosKLFLy8+30YeyAVBLAQIUAxQAAAgIAGakVV3fd10oEAAAABQAAAAYAAAAAAAAAAAAAACAAQAAAABT4bqjbiBQaOG6qW0vZGFuZ2VyLmh0bWxQSwUGAAAAAAEAAQBGAAAARgAAAAAA","base64")],{type:"application/zip"}),"invalid.zip");
const rejected=await fetch(origin+"/api/store/admin/media/bulk",{
 method:"POST",headers:{Cookie:cookie,Origin:origin,"Sec-Fetch-Site":"same-origin"},body:invalidZip,
});
ensure(rejected.status===400,"ZIP with executable markup was not rejected: "+rejected.status);
console.log("ZIP intake E2E PASSED: nested folders, skip existing, retry, reject scripts, Admin & CSRF");

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
 category:"giay-dep",collection:"Test",sku:"EL-CI-"+key,color:"Trắng",size:"M",price_vnd:150000,opening_stock:2,
 image_url:"sprint5-test.png",published:true
}]}});
ensure(imp.status===201&&imp.json.created===1,"CSV product import failed: "+imp.status+" "+imp.text);
const products=await call("/api/store/admin/products",{cookie});
const product=products.json?.items?.find(x=>x.slug===csvSlug);
ensure(product&&!product.published&&product.category==="giay-dep"&&product.image_url===media.url,"Imported CSV product must be hidden, categorized correctly and image mapped; status="+products.status+" payload="+JSON.stringify(products.json)?.slice(0,1800));
ensure(!(await call("/shop")).text.includes(csvSlug),"Hidden imported product appeared in Shop");
console.log("Sprint 5 media & content E2E PASSED: upload -> reject forged files/CSRF -> image roundtrip -> Hero -> CSV hidden import");

const skuAutoSlug="auto-sku-"+key;
const newItem=await call("/api/store/admin/products",{method:"POST",cookie,body:{
 name:"Áo thử nghiệm mã SP",slug:skuAutoSlug,description:"Kiểm thử mã tự cấp và xóa mềm",
 category:"ao",image_url:media.url,collection:"",color:"Trắng",size:"M",
 price_vnd:129000,opening_stock:2,published:false,
}});
ensure(newItem.status===201&&/^SP-[0-9]{3,}$/.test(newItem.json?.sku),"No auto SKU from Go API: "+newItem.text);
const more=await call("/api/store/admin/products/"+newItem.json.id+"/variants",{method:"POST",cookie,body:{
 color:"Trắng",size:"L",price_vnd:129000,opening_stock:1,
}});
ensure(more.status===201&&/^SP-[0-9]{3,}$/.test(more.json?.sku)&&more.json.sku!==newItem.json.sku,
 "Variant SKU not distinct: "+more.text);
// Sprint 6.2–6.4: real gallery -> storefront facets -> physical stock -> archive lifecycle.
const gallerySecond=mediaList.json.items.find(item=>item.original_name==="sprint5-zip-additional.png")?.url;
ensure(gallerySecond?.startsWith("/media/"),"Missing additional gallery image");
const galleryWrite=await call("/api/store/admin/products/"+newItem.json.id+"/images",{
 method:"PUT",cookie,body:{images:[{url:media.url,alt:"Ảnh chính"},{url:gallerySecond,alt:"Ảnh phụ"}]},
});
ensure(galleryWrite.status===200&&galleryWrite.json?.cover===media.url,
 "Gallery write failed: "+galleryWrite.status+" "+galleryWrite.text);
const galleryRead=await call("/api/store/admin/products/"+newItem.json.id+"/images",{cookie});
ensure(galleryRead.status===200&&galleryRead.json?.images?.length===2,"Gallery metadata missing");
const galleryDuplicate=await call("/api/store/admin/products/"+newItem.json.id+"/images",{
 method:"PUT",cookie,body:{images:[{url:media.url,alt:"A"},{url:media.url,alt:"B"}]},
});
ensure(galleryDuplicate.status===400,"Duplicate gallery URLs were accepted");
const galleryUnauth=await call("/api/store/admin/products/"+newItem.json.id+"/images",{method:"PUT",body:{images:[]}});
ensure([401,403].includes(galleryUnauth.status),"Unauthorized gallery change accepted");
const publishSKU=await call("/api/store/admin/products/"+newItem.json.id,{
 method:"PATCH",cookie,body:{
  name:"Áo thử nghiệm mã SP",description:"Kiểm thử sản phẩm có nhiều ảnh",
  collection:"",image_url:media.url,published:true,
 }});
ensure(publishSKU.status===200,"Could not publish SKU test product");
const sprint6Detail=await call("/api/store/products/"+skuAutoSlug);
ensure(sprint6Detail.status===200&&sprint6Detail.json?.images?.length===2,"Public product image gallery not returned");
const facets=await call("/api/store/products/filters");
ensure(facets.status===200&&facets.json?.colors?.includes("Trắng")&&facets.json?.sizes?.includes("M"),
 "Catalog filter options not data-derived");
const matchCatalog=await call("/api/store/products/search?category=ao&color=Tr%E1%BA%AFng&size=M&min_price=100000&max_price=200000&sort=price-asc&page=1");
ensure(matchCatalog.status===200&&matchCatalog.json?.items?.some(x=>x.id===newItem.json.id)
 &&matchCatalog.json?.page_size===12,"Filtered catalog missing product: "+matchCatalog.text);
const filteredOut=await call("/api/store/products/search?category=ao&color=Tr%E1%BA%AFng&size=XXXL&min_price=100000&max_price=200000");
ensure(filteredOut.status===200&&filteredOut.json?.total===0,"Unavailable size returned products");
const badPricing=await call("/api/store/products/search?min_price=300000&max_price=100000");
ensure(badPricing.status===400,"Invalid catalog price interval accepted");
const shopSSR=await call("/shop?category=ao&color=Tr%E1%BA%AFng&size=M");
ensure(shopSSR.status===200&&shopSSR.text.includes("Áo thử nghiệm mã SP"),"Shop SSR did not render filtered database catalog");
const currentStocks=await call("/api/store/admin/inventory",{cookie});
const chosen=currentStocks.json?.items?.find(x=>x.product_id===newItem.json.id&&x.size==="M");
ensure(chosen?.variant_id===newItem.json.variant_id&&chosen?.on_hand===2,
 "Product variant and warehouse are not sharing inventory");
const received=await call("/api/store/admin/inventory/"+chosen.variant_id,{
 method:"PATCH",cookie,body:{action:"RECEIVE",quantity:4,reason:"Demo goods received"},
});
ensure(received.status===200&&received.json?.on_hand===6,"Physical goods receipt inaccurate: "+received.text);
const issued=await call("/api/store/admin/inventory/"+chosen.variant_id,{
 method:"PATCH",cookie,body:{action:"ISSUE",quantity:2,reason:"Physical sample sale"},
});
ensure(issued.status===200&&issued.json?.on_hand===4,"Physical stock issue inaccurate");
const counted=await call("/api/store/admin/inventory/"+chosen.variant_id,{
 method:"PATCH",cookie,body:{action:"COUNT",quantity:3,reason:"Real count after stocktake"},
});
ensure(counted.status===200&&counted.json?.available===3,"Stocktake did not reconcile");
const oversell=await call("/api/store/admin/inventory/"+chosen.variant_id,{
 method:"PATCH",cookie,body:{action:"ISSUE",quantity:9000,reason:"Must be rejected shortage"},
});
ensure(oversell.status===409,"Stock movement allowed negative inventory");
const movements=await call("/api/store/admin/inventory/"+chosen.variant_id+"/history",{cookie});
ensure(movements.status===200&&movements.json?.items?.some(x=>x.type==="COUNT"&&x.reason.includes("stocktake")),
 "Inventory history did not persist stocktake reason");
const stopped=await call("/api/store/admin/variants/"+more.json.variant_id,{
 method:"PATCH",cookie,body:{price_vnd:129000,active:false},
});
ensure(stopped.status===200,"Could not stop selling variation");
const stoppedStock=await call("/api/store/admin/inventory",{cookie});
ensure(stoppedStock.json?.items?.some(x=>x.variant_id===more.json.variant_id&&x.active===false&&x.on_hand===1),
 "Inactive physical inventory was hidden from warehouse API");
console.log("Sprint 6 catalog E2E PASSED: gallery, filters, warehouse receipt/issue/count, history, stopped SKU");

const noAdminDelete=await call("/api/store/admin/products/"+newItem.json.id,{method:"DELETE"});
ensure([401,403].includes(noAdminDelete.status),"Unauthenticated user could delete product");
const removedSKU=await call("/api/store/admin/products/"+newItem.json.id,{method:"DELETE",cookie});
ensure(removedSKU.status===200,"Admin archive rejected: "+removedSKU.status+" "+removedSKU.text);
const archivedStock=await call("/api/store/admin/inventory",{cookie});
ensure(archivedStock.status===200&&archivedStock.json?.items?.some(item=>
 item.variant_id===newItem.json.variant_id&&item.archived===true&&item.on_hand===3),
 "Archived physical stock disappeared from warehouse");
const archiveCatalog=await call("/api/store/products/search?category=ao&color=Tr%E1%BA%AFng&size=M");
ensure(!archiveCatalog.json?.items?.some(item=>item.id===newItem.json.id),
 "Archived product leaked into customer catalog");
const deletedList=await call("/api/store/admin/products?view=trash",{cookie});
ensure(deletedList.status===200&&deletedList.json?.items?.some(item=>item.id===newItem.json.id),
 "Archived product missing from trash");
const activeList=await call("/api/store/admin/products",{cookie});
ensure(!activeList.json?.items?.some(item=>item.id===newItem.json.id),
 "Archived product visible in active catalog");
ensure((await call("/api/store/products/"+skuAutoSlug)).status===404,"Archived product publicly accessible");
const restoredSKU=await call("/api/store/admin/products/"+newItem.json.id+"/restore",{method:"POST",cookie,body:{}});
ensure(restoredSKU.status===200,"Could not restore archived product: "+restoredSKU.status+" "+restoredSKU.text);
const postRestore=await call("/api/store/admin/products",{cookie});
ensure(postRestore.json?.items?.some(item=>item.id===newItem.json.id&&item.published===false),
 "Restored product must remain hidden pending review");
console.log("Sprint 6.1 E2E PASSED: auto SP SKU -> variant SKU -> archive -> trash -> restore hidden");


const payload={
 title:"Bài kiểm thử trực tiếp từ PostgreSQL",
 slug,
 excerpt:"Bài viết thử nghiệm kiểm tra quá trình xuất bản vào PostgreSQL và hiển thị SSR thực.",
 content_json:{type:"doc",content:[
  {type:"heading",attrs:{level:2},content:[{type:"text",text:"Nội dung thử nghiệm từ database"}]},
  {type:"image",attrs:{src:media.url,alt:"Ảnh JPG PNG WebP từ máy"}},
  {type:"paragraph",content:[{type:"text",text:"Đoạn bài thử nghiệm xác thực dữ liệu động từ PostgreSQL đến Next.js trong Docker."}]},
 ]},
 category_slug:"",tag_slugs:[],cover_image_url:media.url,cover_image_alt:"Ảnh bìa từ máy",
 seo_title:"SEO Sprint 4 SQL fixture",seo_description:"Đoạn kiểm thử SEO của bài đã xuất bản.",og_image_url:media.url,status:"DRAFT",
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
for(const snippet of [payload.title,"Nội dung thử nghiệm từ database","BlogPosting","SEO Sprint 4 SQL fixture",media.url,"Ảnh bìa từ máy"]){
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

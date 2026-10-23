// Colorways regression: isolated Docker PostgreSQL, Next.js BFF and Go API.
const origin="http://127.0.0.1:3000";
function check(v,msg){if(!v)throw Error(msg)}
async function api(path,{method="GET",cookie="",body}={}){
 const res=await fetch(origin+"/api/store/"+path,{
  method,headers:{...(cookie?{Cookie:cookie}:{}),...(method!=="GET"?{
   "Content-Type":"application/json",Origin:origin,"Sec-Fetch-Site":"same-origin"
  }:{})},...(method!=="GET"?{body:JSON.stringify(body??{})}:{})
 });
 const text=await res.text();let json;try{json=JSON.parse(text)}catch{json=null}
 return {status:res.status,json,text,cookie:res.headers.get("set-cookie")?.split(";")[0]||""};
}
const auth=await api("auth/admin-demo",{method:"POST",body:{username:"admin",password:"admin"}});
check(auth.status===200&&auth.cookie,"Admin login: "+auth.text);
const cookie=auth.cookie;
const suffix=Date.now().toString(36),slug="ci-colorway-"+suffix;
const created=await api("admin/products",{method:"POST",cookie,body:{
 name:"Enjoy Life Colorway Test",slug,description:"Color photos and size batch",
 category:"ao",color:"Be cát",color_hex:"#C8AE88",color_group:"Be",size:"S",
 sizes:["S","M","L"],price_vnd:269000,opening_stock:4,published:true
}});
check(created.status===201&&created.json.variant_ids?.length===3,
 "Batch create product failed: "+created.text);
const productID=created.json.id;
const initial=await api("admin/products/"+productID+"/variants",{cookie});
check(initial.status===200&&initial.json.items.length===3&&
 initial.json.items.every(x=>x.color==="Be cát"&&x.color_hex==="#C8AE88"&&x.on_hand===4),
 "Batch stock and color metadata mismatch: "+initial.text);
const second=await api("admin/products/"+productID+"/variants",{method:"POST",cookie,body:{
 color:"Đen",color_hex:"#292A2A",color_group:"Đen",size:"M",sizes:["M","L"],
 price_vnd:279000,opening_stock:2
}});
check(second.status===201&&second.json.variant_ids?.length===2,
 "Cannot add second color batch: "+second.text);
const duplicate=await api("admin/products/"+productID+"/variants",{method:"POST",cookie,body:{
 color:"be CÁT",color_hex:"#C8AE88",color_group:"Be",size:"M",
 price_vnd:269000,opening_stock:1
}});
check(duplicate.status===409,"Duplicate color/size should be rejected: "+duplicate.text);
const variants=await api("admin/products/"+productID+"/variants",{cookie});
check(variants.json.items.length===5,"Failed batch request partially created SKUs");
const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7vGZ0AAAAASUVORK5CYII=","base64");
async function upload(name){
 const form=new FormData();form.set("file",new Blob([png],{type:"image/png"}),name);
 const res=await fetch(origin+"/api/store/admin/media",{method:"POST",
  headers:{Cookie:cookie,Origin:origin,"Sec-Fetch-Site":"same-origin"},body:form});
 const json=await res.json().catch(()=>null);
 check(res.status===201&&json?.url,"Cannot upload color fixture: "+JSON.stringify(json));
 return json.url;
}
const beige=await upload("color-beige-"+suffix+".png");
const black=await upload("color-black-"+suffix+".png");
const gallery=[{url:beige,alt:"Be cát",color:"Be cát"},{url:black,alt:"Đen",color:"Đen"}];
const invalid=await api("admin/products/"+productID+"/images",{method:"PUT",cookie,body:{
 images:[{...gallery[0],color:"Màu không có trong SKU"}]
}});
check(invalid.status===400,"Gallery accepted a color with no matching SKU");
const saved=await api("admin/products/"+productID+"/images",{method:"PUT",cookie,body:{images:gallery}});
check(saved.status===200&&saved.json.images?.length===2,"Saving color gallery failed: "+saved.text);
const detail=await api("products/"+slug);
check(detail.status===200&&detail.json.colors?.some(x=>x.name==="Be cát"&&x.hex==="#C8AE88")&&
 detail.json.colors?.some(x=>x.name==="Đen"&&x.hex==="#292A2A"),"Public color swatches missing: "+detail.text);
check(detail.json.images?.length===2&&detail.json.images[0].color==="Be cát"&&
 detail.json.images[1].color==="Đen","Gallery image/color association missing: "+detail.text);
const filter=await api("products/search?color="+encodeURIComponent("Be cát")+"&size=L");
check(filter.status===200&&filter.json.items?.some(x=>x.id===productID),
 "Search color/size filter regression: "+filter.text);
const target=variants.json.items.find(x=>x.color==="Be cát"&&x.size==="M");
const order=await api("orders",{method:"POST",body:{
 client_order_key:"color-batch-"+suffix,customer_name:"Test Color Shopper",
 customer_phone:"0901234567",shipping_address:"CI Colorway Test Street",
 payment_method:"COD",items:[{variant_id:target.id,quantity:1}]
}});
check(order.status===201&&order.json?.order_no,"Colorway SKU cannot be ordered: "+order.text);
const after=await api("admin/products/"+productID+"/variants",{cookie});
check(after.json.items.find(x=>x.id===target.id).reserved===1,
 "Order stock reservation missing on selected color-size");
const legacy=await api("admin/products",{method:"POST",cookie,body:{
 name:"Legacy Colorway Regression",slug:slug+"-legacy",category:"ao",
 color:"Trắng",size:"M",price_vnd:199000,opening_stock:1,published:true
}});
check(legacy.status===201&&legacy.json.variant_id,"Legacy single size request broke: "+legacy.text);
console.log("COLORWAY BFF E2E PASSED: color metadata, batch SKUs, stock, gallery association, filtering, legacy API and ordering.");

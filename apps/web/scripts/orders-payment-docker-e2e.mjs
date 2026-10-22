// End-to-end regression against the actual Next.js proxy + Gin + PostgreSQL.
// Runs only on disposable Docker CI, never on a merchant production database.
const origin="http://127.0.0.1:3000";
function assert(value,message){if(!value)throw Error(message)}
async function req(path,{method="GET",cookie="",body,originOverride}={}){
 const response=await fetch(origin+path,{
  method,
  headers:{
   ...(cookie?{Cookie:cookie}:{}),
   ...(method!=="GET"?{"Content-Type":"application/json",Origin:originOverride??origin,"Sec-Fetch-Site":originOverride?"cross-site":"same-origin"}:{})
  },
  ...(method!=="GET"?{body:JSON.stringify(body??{})}:{})
 });
 const text=await response.text();let data;try{data=JSON.parse(text)}catch{data=null}
 return {code:response.status,data,text,cookie:response.headers.get("set-cookie")?.split(";")[0]??""};
}
const config=await req("/api/store/payments/config");
assert(config.code===200&&typeof config.data?.payos_enabled==="boolean"&&typeof config.data?.status==="string","payOS status endpoint unavailable: "+config.text);
assert(config.data.payos_enabled===false&&config.data.status==="disabled","CI must not enable real-money payOS: "+config.text);
const auth=await req("/api/store/auth/admin-demo",{method:"POST",body:{username:"admin",password:"admin"}});
assert(auth.code===200&&auth.cookie,"Admin login through browser proxy failed: "+auth.text);
const catalog=await req("/api/store/products/everyday-oxford");
assert(catalog.code===200,"Fixture product unavailable: "+catalog.text);
const sku=catalog.data?.variants?.find(x=>x.sku==="EL-OXF-IV-M");
assert(sku&&sku.available>=2,"No stock for COD proxy fixture");
let counter=0;
async function create(){
 const key="ci-bff-order-"+Date.now().toString(36)+"-"+(++counter);
 const result=await req("/api/store/orders",{method:"POST",body:{
  client_order_key:key,
  customer_name:"CI Checkout Test",
  customer_phone:"0901234567",
  shipping_address:"123 CI Street, Ho Chi Minh City",
  payment_method:"COD",
  items:[{variant_id:sku.id,quantity:1}]
 }});
 assert(result.code===201&&/^EL-[A-F0-9]{8}$/.test(result.data?.order_no),"Create COD through browser proxy failed: "+result.code+" "+result.text);
 return result.data.order_no;
}
const first=await create();
const states=["CONFIRMED","PREPARING","SHIPPING","DELIVERED","COMPLETED"];
for(const status of states){
 const denied=await req("/api/store/admin/orders/"+first+"/status",{method:"PATCH",body:{status}});
 assert(denied.code===401,"Unauthenticated customer changed order to "+status);
 const result=await req("/api/store/admin/orders/"+first+"/status",{method:"PATCH",cookie:auth.cookie,body:{status}});
 assert(result.code===200&&result.data?.status===status,"Could not change COD order to "+status+": "+result.code+" "+result.text);
}
const paid=await req("/api/store/admin/orders/"+first+"/paid",{method:"POST",cookie:auth.cookie});
assert(paid.code===200&&paid.data?.payment_status==="PAID","COD collection failed via browser proxy");
const second=await create();
const cross=await req("/api/store/admin/orders/"+second+"/status",{method:"PATCH",cookie:auth.cookie,originOverride:"https://not-this-site.invalid",body:{status:"CONFIRMED"}});
assert(cross.code===403,"CSRF protection missing on status change");
const cancelled=await req("/api/store/admin/orders/"+second+"/status",{method:"PATCH",cookie:auth.cookie,body:{status:"CANCELLED"}});
assert(cancelled.code===200&&cancelled.data?.status==="CANCELLED","Cannot cancel COD and release reserved stock via browser proxy: "+cancelled.code+" "+cancelled.text);
const after=await req("/api/store/admin/orders",{cookie:auth.cookie});
assert(after.code===200&&after.data?.items?.find(o=>o.order_no===first)?.status==="COMPLETED"&&after.data.items.find(o=>o.order_no===second)?.status==="CANCELLED","Admin order table did not refresh persisted states");
console.log("Sprint 8.1 E2E PASSED: payOS disabled-state diagnostics, Next.js order creation, all COD state transitions, COD paid, cancellation, CSRF and persisted Admin list.");

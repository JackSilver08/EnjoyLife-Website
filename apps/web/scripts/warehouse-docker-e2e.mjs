// Sprint 9: simulate the real web proxy -> Gin -> PostgreSQL warehouse workflow.
// CI uses an isolated Docker database. Never run against production.
const origin="http://127.0.0.1:3000";
async function request(path,{method="GET",cookie="",body}={}){
 const response=await fetch(origin+"/api/store/"+path,{
  method,headers:{...(cookie?{Cookie:cookie}:{}),...(method!=="GET"?{"Content-Type":"application/json",Origin:origin,"Sec-Fetch-Site":"same-origin"}:{})},
  ...(method!=="GET"?{body:JSON.stringify(body??{})}:{})
 });
 let data;const text=await response.text();try{data=JSON.parse(text)}catch{data=null}
 return {status:response.status,data,text,cookie:response.headers.get("set-cookie")?.split(";")[0]??""};
}
const assert=(condition,why)=>{if(!condition)throw Error(why)};
const login=await request("auth/admin-demo",{method:"POST",body:{username:"admin",password:"admin"}});
assert(login.status===200&&login.cookie,"Cannot log in as dev admin: "+login.text);
const cookie=login.cookie;
const suffix=Date.now().toString(36);
const product=await request("admin/products",{method:"POST",cookie,body:{
 name:"Sprint9 stock fixture",slug:"sprint9-stock-"+suffix,
 category:"ao",color:"Xanh",size:"M",price_vnd:200000,
 opening_stock:0,published:true
}});
assert(product.status===201&&product.data.variant_id,"Cannot create stock fixture: "+product.text);
const id=product.data.variant_id;
const noConsent=await request("stock-alerts",{method:"POST",body:{variant_id:id,email:"ci@example.com",consent:false}});
assert(noConsent.status===400,"Waitlist accepted missing consent.");
const joined=await request("stock-alerts",{method:"POST",body:{variant_id:id,email:"ci@example.com",consent:true}});
assert(joined.status===202,"Waitlist signup through Next.js proxy failed: "+joined.text);
const supplier=await request("admin/warehouse/suppliers",{method:"POST",cookie,body:{
 name:"CI Supplier",lead_days:6,contact:"Internal testing only"
}});
assert(supplier.status===201,"Supplier via Next.js proxy: "+supplier.text);
const po=await request("admin/warehouse/purchases",{method:"POST",cookie,body:{
 supplier_id:supplier.data.id,note:"CI partial receipt",
 items:[{variant_id:id,quantity:4,unit_cost_vnd:105000}]
}});
assert(po.status===201&&po.data.id,"Purchase order via Next.js proxy: "+po.text);
const detail=await request("admin/warehouse/purchases/"+po.data.id,{cookie});
assert(detail.status===200&&detail.data.items?.length===1,"Purchase detail BFF: "+detail.text);
const line=detail.data.items[0];
const data={request_key:"ci-test-"+suffix,
 lines:[{item_id:line.id,accepted:2,quarantined:1}],
 note:"Physical condition verified"
};
const first=await request("admin/warehouse/purchases/"+po.data.id+"/receipts",{method:"POST",cookie,body:data});
assert(first.status===201&&first.data.status==="PARTIAL","Physical partial goods receipt: "+first.text);
const again=await request("admin/warehouse/purchases/"+po.data.id+"/receipts",{method:"POST",cookie,body:data});
assert(again.status===200&&again.data.idempotent===true,"Duplicate receipt counted again: "+again.text);
const stock=await request("admin/inventory",{cookie});
const entry=stock.data?.items?.find(v=>v.variant_id===id);
assert(stock.status===200&&entry?.on_hand===3&&entry?.unavailable===1&&entry?.available===2,"QC-split stock mismatch: "+stock.text.slice(0,500));
const insights=await request("admin/warehouse/insights",{cookie});
assert(insights.status===200&&Array.isArray(insights.data?.items),"Admin inventory insights not visible.");
const waiting=await request("admin/warehouse/waitlist",{cookie});
assert(waiting.status===200&&waiting.data.items?.some(x=>x.email==="ci@example.com"),"Admin cannot see opt-in waitlist.");
const unauthorized=await request("admin/warehouse/waitlist");
assert(unauthorized.status===401,"Public endpoint exposed waitlist contact data.");
const aiConfig=await request("admin/warehouse/ai-review",{method:"POST",cookie});
assert(aiConfig.status===503&&typeof aiConfig.data?.error==="string","AI review should explain missing CI OpenAI key without touching paid service.");
const aiUnauthorized=await request("admin/warehouse/ai-review",{method:"POST"});
assert(aiUnauthorized.status===401,"Anonymous user reached private stock AI analysis.");
console.log("SPRINT9 BFF E2E PASSED: supplier, PO, partial QC receive, idempotent retries, waitlist consent, stock insights and authenticated contact access.");

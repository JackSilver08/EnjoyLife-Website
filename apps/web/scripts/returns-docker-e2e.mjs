// Sprint 11 end-to-end against real Next.js BFF -> Gin -> disposable PostgreSQL.
// No real payOS refund, email delivery, or money movement.
const host="http://127.0.0.1:3000";
const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
async function request(path,{method="GET",cookie="",body}={}){
 const response=await fetch(host+"/api/store/"+path,{method,
  headers:{...(cookie?{Cookie:cookie}:{}),...(method!=="GET"?{
   "Content-Type":"application/json",Origin:host,"Sec-Fetch-Site":"same-origin"
  }:{})},...(method!=="GET"?{body:JSON.stringify(body??{})}:{})});
 const text=await response.text();let data;try{data=JSON.parse(text)}catch{data=null}
 return {code:response.status,data,text,cookie:response.headers.get("set-cookie")?.split(";")[0]??""};
}
const admin=await request("auth/admin-demo",{method:"POST",body:{username:"admin",password:"admin"}});
assert(admin.code===200&&admin.cookie,"Cannot log into CI admin");
const cookie=admin.cookie,seed=Date.now().toString(36);
const product=await request("admin/products",{method:"POST",cookie,body:{
 name:"Sprint11 return test dress",slug:"ci-return-"+seed,
 category:"ao",color:"Be",size:"M",price_vnd:190000,opening_stock:8,published:true
}});
assert(product.code===201&&product.data?.variant_id,"Cannot create return fixture: "+product.text);
const sku=product.data.variant_id;
const order=await request("orders",{method:"POST",body:{
 client_order_key:"sprint11-e2e-"+seed,customer_name:"CI shopper",
 customer_phone:"0901234567",shipping_address:"CI warehouse returns test",
 payment_method:"COD",items:[{variant_id:sku,quantity:2}]
}});
assert(order.code===201&&order.data?.order_no,"Cannot create COD order: "+order.text);
const no=order.data.order_no;
const token=order.data.order_token;
assert(typeof token==="string"&&token.length===48,"Cannot track customer order");
for(const state of ["CONFIRMED","PREPARING","SHIPPING","DELIVERED"]){
 const response=await request("admin/orders/"+no+"/status",{method:"PATCH",cookie,body:{status:state}});
 assert(response.code===200,"Cannot advance "+state+": "+response.text);
}
const paid=await request("admin/orders/"+no+"/paid",{method:"POST",cookie});
assert(paid.code===200,"COD collection needed before customer return: "+paid.text);
const available=await request("admin/orders/"+no+"/returnable",{cookie});
assert(available.code===200&&available.data?.items?.length===1,"Returnable details unavailable: "+available.text);
const item=available.data.items[0];
const payload={order_no:no,kind:"CUSTOMER_RETURN",reason:"Wrong size for shopper",
 items:[{order_item_id:item.order_item_id,quantity:1}]};
const denied=await request("admin/returns",{method:"POST",body:payload});
assert(denied.code===401,"Unauthorized RMA creation accepted");
const created=await request("admin/returns",{method:"POST",cookie,body:payload});
assert(created.code===201&&created.data?.id,"Create RMA via BFF: "+created.text);
const rid=created.data.id;
const listed=await request("admin/returns",{cookie});
assert(listed.code===200&&listed.data.items.some(i=>i.id===rid),"Admin cannot see RMA");
const decision=await request("admin/returns/"+rid+"/decision",{method:"POST",cookie,body:{action:"APPROVE",note:"Valid return request"}});
assert(decision.code===200,"Approve RMA via BFF: "+decision.text);
const detail=await request("admin/returns/"+rid,{cookie});
assert(detail.code===200&&detail.data?.items?.length===1,"RMA lines unavailable");
const line=detail.data.items[0];
const receipt={request_key:"bff-return-"+seed,note:"Passed warehouse QC",lines:[{item_id:line.id,good:1,quarantined:0}]};
const received=await request("admin/returns/"+rid+"/receive",{method:"POST",cookie,body:receipt});
assert(received.code===201&&received.data.status==="RECEIVED","Paid COD return must await refund: "+received.text);
const retry=await request("admin/returns/"+rid+"/receive",{method:"POST",cookie,body:receipt});
assert(retry.code===200&&retry.data.idempotent===true,"Duplicate RMA receipt must be safe: "+retry.text);
const refund=await request("admin/returns/"+rid+"/refund",{method:"POST",cookie,body:{reference:"ci-refund-"+seed,amount_vnd:190000}});
assert(refund.code===200&&refund.data.status==="CLOSED","Manual refund confirmation failed: "+refund.text);
const refundedAgain=await request("admin/returns/"+rid+"/refund",{method:"POST",cookie,body:{reference:"ci-refund-"+seed,amount_vnd:190000}});
assert(refundedAgain.code===409,"Double refund confirmation must be blocked");
const customerTracking=await request("orders/"+token);
assert(customerTracking.code===200&&customerTracking.data?.return_status==="CLOSED"&&
 customerTracking.data?.return_refund_status==="CONFIRMED","Customer cannot track finalized RMA: "+customerTracking.text);
const inv=await request("admin/inventory",{cookie});
const stock=inv.data?.items?.find(x=>x.variant_id===sku);
assert(stock?.on_hand===7&&stock?.unavailable===0,"Return stock should be shipped 2 then returned 1 exactly once: "+JSON.stringify(stock));
const unauthorized=await request("admin/returns/"+rid);
assert(unauthorized.code===401,"RMA private contact data is exposed publicly");
console.log("SPRINT11 BFF E2E PASSED: Admin role, returnable SKU, RMA create, approval, receipt, idempotency and stock ledger.");

// Run exclusively on the disposable Docker Compose CI stack.
const origin="http://127.0.0.1:3000";
function ensure(ok,msg){if(!ok)throw Error(msg)}
async function request(path,{method="GET",cookie="",body,originOverride}={}){
 const response=await fetch(origin+path,{method,headers:{
  ...(cookie?{Cookie:cookie}:{}),
  ...(method!=="GET"?{"Content-Type":"application/json",Origin:originOverride??origin,"Sec-Fetch-Site":originOverride?"cross-site":"same-origin"}:{}),
 },...(method!=="GET"?{body:JSON.stringify(body??{})}:{})});
 const text=await response.text();let json;try{json=JSON.parse(text)}catch{json=null}
 return {status:response.status,json,text,cookie:response.headers.get("set-cookie")?.split(";")[0]??""};
}
const id=Date.now().toString(36);
const email="staff-bff-"+id+"@example.test";
const admin=await request("/api/store/auth/admin-demo",{method:"POST",body:{username:"admin",password:"admin"}});
ensure(admin.status===200&&admin.cookie,"Sprint 7 Admin login failed");
const created=await request("/api/store/admin/staff",{method:"POST",cookie:admin.cookie,body:{email,name:"CI Staff",password:"InitialPassword2026!"}});
ensure(created.status===201&&created.json?.id,"Cannot create staff via Next proxy: "+created.status+" "+created.text);
const staff=await request("/api/store/auth/login",{method:"POST",body:{email,password:"InitialPassword2026!"}});
ensure(staff.status===200&&staff.cookie&&staff.json?.user?.role==="STAFF","Staff cannot log in via Next proxy");
for(const path of ["admin/orders","admin/inventory","admin/products"]){
 const found=await request("/api/store/"+path,{cookie:staff.cookie});
 ensure(found.status===200,"Staff read failed: "+path+" "+found.status);
}
for(const path of ["admin/staff","admin/dashboard","admin/reports","admin/users"]){
 const denied=await request("/api/store/"+path,{cookie:staff.cookie});
 ensure(denied.status===403,"Sensitive route allowed to staff: "+path+" "+denied.status);
}
const disabledMutation=await request("/api/store/admin/staff",{method:"POST",cookie:staff.cookie,body:{email:"nope@example.test",name:"No",password:"PasswordShouldFail2026!"}});
ensure(disabledMutation.status===403,"Staff created another staff account");
const crossSite=await request("/api/store/admin/staff",{method:"POST",cookie:admin.cookie,originOverride:"https://evil.invalid",body:{email:"evil@example.test",name:"Evil",password:"PasswordShouldFail2026!"}});
ensure(crossSite.status===403,"Cross-origin staff creation accepted");
const inventory=await request("/api/store/admin/inventory",{cookie:staff.cookie});
const variant=inventory.json?.items?.[0]?.variant_id;
ensure(variant,"No test inventory item present");
const stock=await request("/api/store/admin/inventory/"+variant,{method:"PATCH",cookie:staff.cookie,body:{action:"RECEIVE",quantity:1,reason:"Staff CI inbound test"}});
ensure(stock.status===200,"Staff stock operation failed via BFF: "+stock.status+" "+stock.text);
const locked=await request("/api/store/admin/staff/"+created.json.id,{method:"PATCH",cookie:admin.cookie,body:{disabled:true}});
ensure(locked.status===200,"Admin cannot disable staff");
const revoked=await request("/api/store/admin/orders",{cookie:staff.cookie});
ensure(revoked.status===401,"Disabled staff session still valid");
const enabled=await request("/api/store/admin/staff/"+created.json.id,{method:"PATCH",cookie:admin.cookie,body:{disabled:false}});
ensure(enabled.status===200,"Admin cannot re-enable staff");
const reset=await request("/api/store/admin/staff/"+created.json.id+"/reset-password",{method:"POST",cookie:admin.cookie,body:{password:"ResetPassword2026!"}});
ensure(reset.status===200,"Admin staff password reset failed");
const login=await request("/api/store/auth/login",{method:"POST",body:{email,password:"ResetPassword2026!"}});
ensure(login.status===200&&login.cookie,"Reset staff cannot login");
const changed=await request("/api/store/auth/change-password",{method:"POST",cookie:login.cookie,body:{current_password:"ResetPassword2026!",new_password:"StaffUpdated2026!"}});
ensure(changed.status===200,"Staff self-service password change failed: "+changed.status+" "+changed.text);
console.log("Sprint 7 BFF E2E PASSED: staff login, read/write least privilege, Admin CRUD, CSRF, revoke/reset/change password");

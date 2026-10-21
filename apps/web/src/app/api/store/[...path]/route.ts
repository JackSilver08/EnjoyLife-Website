import {NextRequest,NextResponse} from "next/server";
const base=process.env.API_INTERNAL_URL??"http://localhost:8081";
function allowed(path:string,method:string){
 if(method==="GET")return path==="products"||path==="policies"||/^products\/[a-z0-9-]{1,100}$/.test(path)||/^orders\/[a-f0-9]{48}$/.test(path)||["auth/me","account/orders","admin/summary","admin/dashboard","admin/orders","admin/users","admin/inventory","admin/products","admin/reports"].includes(path)||/^admin\/products\/[a-f0-9-]{36}\/variants$/.test(path);
 if(method==="POST")return ["orders","auth/register","auth/login","auth/logout","auth/admin-demo","admin/products"].includes(path)||/^admin\/orders\/EL-[A-F0-9]{8}\/paid$/.test(path)||/^admin\/products\/[a-f0-9-]{36}\/variants$/.test(path);
 if(method==="PATCH")return /^admin\/orders\/EL-[A-F0-9]{8}\/status$/.test(path)||/^admin\/inventory\/[a-f0-9-]{36}$/.test(path)||/^admin\/products\/[a-f0-9-]{36}$/.test(path)||/^admin\/variants\/[a-f0-9-]{36}$/.test(path);
 return false;
}
async function forward(req:NextRequest,params:Promise<{path:string[]}>,method:"GET"|"POST"|"PATCH"){
 const {path:segments}=await params;const path=segments.join("/");
 if(!allowed(path,method))return NextResponse.json({error:"Route not allowed"},{status:404});
 if(method!=="GET"){
  // nextUrl.origin may describe Next.js' internal Docker address (0.0.0.0:3000)
  // rather than the public Host sent by the browser. Compare the Origin host
  // against the incoming Host, never against the internal runtime URL.
  const origin=req.headers.get("origin");
  if(origin){
   const host=req.headers.get("host");
   let allowedOrigin=false;
   try{
    const parsed=new URL(origin);
    allowedOrigin=!!host && (parsed.protocol==="http:"||parsed.protocol==="https:") && parsed.host.toLowerCase()===host.toLowerCase();
   }catch{}
   if(!allowedOrigin)return NextResponse.json({error:"Cross-origin request refused"},{status:403});
  }
  const site=req.headers.get("sec-fetch-site");
  if(site&&site!=="same-origin"&&site!=="none")return NextResponse.json({error:"Cross-site request refused"},{status:403});
 }
 try{
  const url=new URL(base+"/api/v1/"+path);
  if(method==="GET"){const q=req.nextUrl.searchParams.get("q");if(q)url.searchParams.set("q",q.slice(0,100));}
  const upstream=await fetch(url,{method,headers:{"Content-Type":"application/json","Cookie":req.headers.get("cookie")??""},body:method==="GET"?undefined:await req.text(),cache:"no-store",signal:AbortSignal.timeout(12000)});
  const headers=new Headers({"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
  upstream.headers.forEach((value,key)=>{if(key.toLowerCase()==="set-cookie")headers.append("Set-Cookie",value)});
  return new NextResponse(await upstream.text(),{status:upstream.status,headers});
 }catch{return NextResponse.json({error:"Không kết nối được máy chủ. Vui lòng thử lại."},{status:503});}
}
type Ctx={params:Promise<{path:string[]}>};
export async function GET(req:NextRequest,{params}:Ctx){return forward(req,params,"GET")}
export async function POST(req:NextRequest,{params}:Ctx){return forward(req,params,"POST")}
export async function PATCH(req:NextRequest,{params}:Ctx){return forward(req,params,"PATCH")}

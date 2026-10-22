import {NextRequest,NextResponse} from "next/server";
const base=process.env.API_INTERNAL_URL??"http://localhost:8081";
function allowed(path:string,method:string){
 if(method==="GET")return ["blog/articles","blog/categories","blog/tags","admin/blog/articles","admin/media","site/content"].includes(path)||/^blog\/articles\/[a-z0-9-]{3,140}$/.test(path)||/^admin\/blog\/articles\/[a-f0-9-]{36}$/.test(path)||path==="products"||path==="products/search"||path==="products/filters"||path==="policies"||/^products\/[a-z0-9-]{1,100}$/.test(path)||/^orders\/[a-f0-9]{48}$/.test(path)||["auth/me","account/orders","admin/summary","admin/dashboard","admin/orders","admin/users","admin/inventory","admin/products","admin/reports"].includes(path)||/^admin\/products\/[a-f0-9-]{36}\/(variants|images)$/.test(path)||/^admin\/inventory\/[a-f0-9-]{36}\/history$/.test(path);
 if(method==="POST")return ["admin/blog/articles","admin/blog/categories","admin/blog/tags","admin/media","admin/media/bulk","admin/products/import","orders","auth/register","auth/login","auth/logout","auth/admin-demo","admin/products"].includes(path)||/^admin\/orders\/EL-[A-F0-9]{8}\/paid$/.test(path)||/^admin\/products\/[a-f0-9-]{36}\/variants$/.test(path)||/^admin\/products\/[a-f0-9-]{36}\/restore$/.test(path);
 if(method==="PUT")return /^admin\/products\/[a-f0-9-]{36}\/images$/.test(path)||path==="admin/site/content"||/^admin\/blog\/articles\/[a-f0-9-]{36}$/.test(path);
 if(method==="DELETE")return /^admin\/blog\/articles\/[a-f0-9-]{36}$/.test(path)||/^admin\/products\/[a-f0-9-]{36}$/.test(path);
 if(method==="PATCH")return /^admin\/blog\/articles\/[a-f0-9-]{36}\/status$/.test(path)||/^admin\/orders\/EL-[A-F0-9]{8}\/status$/.test(path)||/^admin\/inventory\/[a-f0-9-]{36}$/.test(path)||/^admin\/products\/[a-f0-9-]{36}$/.test(path)||/^admin\/variants\/[a-f0-9-]{36}$/.test(path);
 return false;
}
async function forward(req:NextRequest,params:Promise<{path:string[]}>,method:"GET"|"POST"|"PATCH"|"PUT"|"DELETE"){
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
  if(method==="GET"){
   for(const key of ["q","limit","offset","category","tag","status","view","color","size","sort","min_price","max_price","page"]){
    const v=req.nextUrl.searchParams.get(key);
    if(v!==null)url.searchParams.set(key,v.slice(0,100));
   }
  }
  const bulk=path==="admin/media/bulk"&&method==="POST";
  const upload=(path==="admin/media"||bulk)&&method==="POST";
  const uploadLimit=bulk?32_000_000:9_500_000;
  let payload:BodyInit|undefined;
  if(method!=="GET"){
   if(upload){
    const length=Number(req.headers.get("content-length")||0);
    if(length>uploadLimit)return NextResponse.json({error:"Tệp quá lớn."},{status:413});
    const reader=req.body?.getReader();
    if(!reader)return NextResponse.json({error:"Không có dữ liệu ảnh."},{status:400});
    const chunks:Uint8Array[]=[];
    let total=0;
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      total+=value.byteLength;
      if(total>uploadLimit){await reader.cancel().catch(()=>{});return NextResponse.json({error:"Tệp quá lớn."},{status:413})}
      chunks.push(value);
    }
    const bytes=new Uint8Array(total);
    let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
    payload=bytes.buffer;
   }else payload=await req.text();
  }
  const headersUpstream:Record<string,string>={"Cookie":req.headers.get("cookie")??""};
  if(upload)headersUpstream["Content-Type"]=req.headers.get("content-type")??"";
  else headersUpstream["Content-Type"]="application/json";
  const upstream=await fetch(url,{method,headers:headersUpstream,body:payload,cache:"no-store",signal:AbortSignal.timeout(bulk?120000:upload?30000:12000)});
  const headers=new Headers({"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
  upstream.headers.forEach((value,key)=>{if(key.toLowerCase()==="set-cookie")headers.append("Set-Cookie",value)});
  if(upstream.status===204||upstream.status===205||upstream.status===304){
   headers.delete("Content-Type");
   return new NextResponse(null,{status:upstream.status,headers});
  }
  return new NextResponse(await upstream.text(),{status:upstream.status,headers});
 }catch(err){
  console.error("Store API proxy error:", err);
  return NextResponse.json({error:"Không kết nối được máy chủ. Vui lòng thử lại."},{status:503});
 }
}
type Ctx={params:Promise<{path:string[]}>};
export async function GET(req:NextRequest,{params}:Ctx){return forward(req,params,"GET")}
export async function POST(req:NextRequest,{params}:Ctx){return forward(req,params,"POST")}
export async function PATCH(req:NextRequest,{params}:Ctx){return forward(req,params,"PATCH")}

export async function PUT(req:NextRequest,{params}:Ctx){return forward(req,params,"PUT")}
export async function DELETE(req:NextRequest,{params}:Ctx){return forward(req,params,"DELETE")}

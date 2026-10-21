import { NextRequest, NextResponse } from "next/server";

// Same-origin narrow BFF proxy. Never proxy arbitrary URLs or private admin endpoints.
const base = process.env.API_INTERNAL_URL ?? "http://localhost:8081";
const allowedGet = (path: string) =>
  path === "products" || path === "policies" || /^products\/[a-z0-9-]{1,100}$/.test(path)
  || /^orders\/[a-f0-9]{48}$/.test(path) || path === "auth/me" || path === "account/orders"
  || path === "admin/summary" || path === "admin/orders" || path === "admin/users";
const allowedPost = (path: string) => path === "orders" || path === "auth/register" || path === "auth/login" || path === "auth/logout";

async function forward(req: NextRequest, params: Promise<{path: string[]}>, method: "GET"|"POST") {
  const {path: segments} = await params;
  const path = segments.join("/");
  if (method === "GET" ? !allowedGet(path) : !allowedPost(path))
    return NextResponse.json({error:"Route not allowed"},{status:404});
  try {
    const url = new URL(`${base}/api/v1/${path}`);
    if (method === "GET") { const q = req.nextUrl.searchParams.get("q"); if (q) url.searchParams.set("q",q.slice(0,100)); }
    const upstream = await fetch(url,{ method, headers: {"Content-Type":"application/json","Cookie":req.headers.get("cookie") ?? ""},
      body: method === "POST" ? await req.text() : undefined,cache:"no-store",signal:AbortSignal.timeout(12000) });
    const body = await upstream.text();
    const headers={"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"} as Record<string,string>;
    const setCookie=upstream.headers.get("set-cookie"); if(setCookie) headers["Set-Cookie"]=setCookie;
    return new NextResponse(body,{status:upstream.status,headers});
  } catch {return NextResponse.json({error:"Không kết nối được máy chủ. Vui lòng thử lại."},{status:503});}
}
export async function GET(req:NextRequest,{params}:{params:Promise<{path:string[]}>}) {return forward(req,params,"GET");}
export async function POST(req:NextRequest,{params}:{params:Promise<{path:string[]}>}) {return forward(req,params,"POST");}

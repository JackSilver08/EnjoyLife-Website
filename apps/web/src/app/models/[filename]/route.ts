import {NextResponse} from "next/server";
const base=process.env.API_INTERNAL_URL??"http://localhost:8081";
const filenamePattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.glb$/;
export async function GET(_request:Request,{params}:{params:Promise<{filename:string}>}){
 const {filename}=await params;
 if(!filenamePattern.test(filename))return new NextResponse(null,{status:404});
 try{
  const upstream=await fetch(base+"/api/v1/models/"+filename,{
   cache:"no-store",signal:AbortSignal.timeout(15000)
  });
  if(!upstream.ok)return new NextResponse(null,{status:upstream.status===404?404:503});
  if(upstream.headers.get("content-type")?.split(";")[0]!=="model/gltf-binary")
   return new NextResponse(null,{status:502});
  return new NextResponse(upstream.body,{status:200,headers:{
   "Content-Type":"model/gltf-binary",
   "Cache-Control":"public, max-age=31536000, immutable",
   "X-Content-Type-Options":"nosniff",
   "Content-Security-Policy":"default-src 'none'; sandbox"
  }});
 }catch{return new NextResponse(null,{status:503})}
}

import {NextResponse} from "next/server";
const base=process.env.API_INTERNAL_URL??"http://localhost:8081";
const filenamePattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|png|webp)$/;
export async function GET(_request:Request,{params}:{params:Promise<{filename:string}>}){
 const {filename}=await params;
 if(!filenamePattern.test(filename))return new NextResponse(null,{status:404});
 try{
  const res=await fetch(base+"/api/v1/media/"+filename,{cache:"no-store",signal:AbortSignal.timeout(8000)});
  if(!res.ok)return new NextResponse(null,{status:res.status===404?404:503});
  const type=res.headers.get("content-type")??"";
  if(!["image/jpeg","image/png","image/webp"].includes(type))return new NextResponse(null,{status:502});
  return new NextResponse(res.body,{status:200,headers:{
   "Content-Type":type,"Cache-Control":"public, max-age=31536000, immutable",
   "X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox",
  }});
 }catch{return new NextResponse(null,{status:503})}
}

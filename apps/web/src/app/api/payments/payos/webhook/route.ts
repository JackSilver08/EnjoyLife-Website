import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 // Public payOS callback; Go verifies the signed body before any DB mutation.
 const size=Number(req.headers.get("content-length")??"0");
 if(size>32768)return NextResponse.json({error:"Payload too large"},{status:413});
 let raw:string;
 try{raw=await req.text();if(Buffer.byteLength(raw,"utf8")>32768)return NextResponse.json({error:"Payload too large"},{status:413})}
 catch{return NextResponse.json({error:"Invalid payload"},{status:400})}
 try{
  const res=await fetch((process.env.API_INTERNAL_URL??"http://localhost:8081")+"/api/v1/payments/payos/webhook",{
   method:"POST",headers:{"Content-Type":"application/json"},body:raw,cache:"no-store",signal:AbortSignal.timeout(12000)
  });
  return new NextResponse(await res.text(),{status:res.status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Gateway unavailable"},{status:503})}
}

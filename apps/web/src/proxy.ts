import {NextRequest,NextResponse} from "next/server";
// Basic authentication is ONLY a local design-preview gate, never production RBAC.
export function proxy(request:NextRequest){
 if(!request.nextUrl.pathname.startsWith("/admin")) return NextResponse.next();
 const user=process.env.ADMIN_PREVIEW_USER;
 const pass=process.env.ADMIN_PREVIEW_PASSWORD;
 if(process.env.NODE_ENV!=="development"||!user||!pass) return new NextResponse("Not found",{status:404});
 const authorization=request.headers.get("authorization")||"";
 let credentials="";
 try{if(authorization.startsWith("Basic ")) credentials=atob(authorization.slice(6));}catch{}
 if(credentials!==user+":"+pass) return new NextResponse("Admin design preview only",{status:401,headers:{"WWW-Authenticate":'Basic realm="Enjoy Life demo"', "Cache-Control":"no-store"}});
 return NextResponse.next();
}
export const config={matcher:["/admin/:path*"]};

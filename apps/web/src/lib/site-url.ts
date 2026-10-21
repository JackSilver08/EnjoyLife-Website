const localOrigin="http://localhost:3000";
const raw=process.env.NEXT_PUBLIC_SITE_URL?.trim()||localOrigin;
export function getSiteUrl():URL{
 try{
  const u=new URL(raw);
  if(!["http:","https:"].includes(u.protocol)||u.username||u.password||u.pathname!=="/"||u.search||u.hash)throw new Error("invalid");
  return u;
 }catch{return new URL(localOrigin)}
}
// Prevent accidentally indexing localhost, staging, private hosts or preview environments.
// Production must explicitly configure its public HTTPS domain.
export function mayIndex():boolean{
 const u=getSiteUrl();
 const host=u.hostname.toLowerCase();
 return process.env.NODE_ENV==="production"&&u.protocol==="https:"&&
 !["localhost","127.0.0.1","0.0.0.0","::1"].includes(host)&&
 !host.endsWith(".local")&&!host.endsWith(".test")&&!host.endsWith(".internal")&&
 !/^(?:10|127|192\.168|172\.(?:1[6-9]|2[0-9]|3[01]))\./.test(host);
}
export function canonical(path:string):string{
 return new URL(path,getSiteUrl()).toString();
}

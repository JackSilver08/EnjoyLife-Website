export type SiteContent={
 hero_image_url:string;hero_eyebrow:string;hero_title:string;hero_emphasis:string;
 story_image_url:string;story_eyebrow:string;story_title:string;story_emphasis:string;story_p1:string;story_p2:string;
};
export async function fetchSiteContent():Promise<SiteContent|null>{
 const base=process.env.API_INTERNAL_URL??"http://localhost:8081";
 try{
  const response=await fetch(base+"/api/v1/site/content",{cache:"no-store",signal:AbortSignal.timeout(6000)});
  if(!response.ok)return null;
  return response.json() as Promise<SiteContent>;
 }catch{return null}
}

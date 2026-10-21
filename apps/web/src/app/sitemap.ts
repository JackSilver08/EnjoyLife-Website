import type {MetadataRoute} from "next";
import {getPublishedArticles} from "@/lib/journal-api";
import {canonical,mayIndex} from "@/lib/site-url";
export const dynamic="force-dynamic";

// Sitemap is public only when the store has an explicitly configured HTTPS domain.
// Never include drafts, soft-deleted entries or development/preview URLs.
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 if(!mayIndex())return [];
 const routes:MetadataRoute.Sitemap=[
  {url:canonical("/"),changeFrequency:"weekly",priority:1},
  {url:canonical("/shop"),changeFrequency:"daily",priority:.9},
  {url:canonical("/blog"),changeFrequency:"daily",priority:.8},
  {url:canonical("/about"),changeFrequency:"monthly",priority:.4},
  {url:canonical("/contact"),changeFrequency:"monthly",priority:.3},
 ];
 try{
  let offset=0;
  // Sprint 2 API supports offsets 0..10000; we cap traversal at the API's limit.
  while(offset<=9990){
   const page=await getPublishedArticles({limit:30,offset});
   for(const article of page.items){
    if(!article.slug)continue;
    routes.push({
     url:canonical("/blog/"+article.slug),
     lastModified:article.updated_at?new Date(article.updated_at):undefined,
     changeFrequency:"weekly",priority:.7,
    });
   }
   offset+=30;
   if(page.items.length<30||offset>=page.total)break;
  }
 }catch(error){
  // A failed database read must never cause draft exposure or create fabricated URLs.
  console.error("Journal sitemap could not read published articles",error);
 }
 return routes;
}

import type {MetadataRoute} from "next";
import {getSiteUrl,mayIndex} from "@/lib/site-url";
export const dynamic="force-dynamic";
export default function robots():MetadataRoute.Robots{
 const publicSite=mayIndex();
 return {
  rules:publicSite
   ?[{userAgent:"*",allow:"/",disallow:["/admin/","/account","/cart","/checkout","/api/","/orders/"]}]
   :[{userAgent:"*",disallow:"/"}],
  ...(publicSite?{sitemap:new URL("/sitemap.xml",getSiteUrl()).toString()}:{})
 };
}

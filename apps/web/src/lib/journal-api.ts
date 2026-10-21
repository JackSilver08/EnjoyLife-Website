import "server-only";
import type {BlogArticle, BlogCategory, BlogList, BlogTag} from "@/lib/blog-types";

const base=process.env.API_INTERNAL_URL ?? "http://localhost:8081";
const path="/api/v1/blog";
const PUBLIC_SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const PAGE_SIZE=9;

export class JournalUnavailableError extends Error {
 constructor(){super("Enjoy Journal hiện không kết nối được dữ liệu. Vui lòng thử lại.");this.name="JournalUnavailableError";}
}
function safeSlug(value:string,max=80):string{
 return value.length>=2&&value.length<=max&&PUBLIC_SLUG.test(value)?value:"";
}
async function request<T>(pathAndSearch:string):Promise<{status:number;value:T|null}>{
 let res:Response;
 try{
  res=await fetch(base+path+pathAndSearch,{
   cache:"no-store",
   headers:{Accept:"application/json"},
   signal:AbortSignal.timeout(6500),
  });
 }catch{throw new JournalUnavailableError()}
 if(res.status===404)return {status:404,value:null};
 if(!res.ok)throw new JournalUnavailableError();
 try{return {status:res.status,value:await res.json() as T}}
 catch{throw new JournalUnavailableError()}
}

export async function getPublishedArticles({
 limit=PAGE_SIZE,offset=0,category="",tag="",
}: {limit?:number;offset?:number;category?:string;tag?:string}={}):Promise<BlogList>{
 const params=new URLSearchParams({
  limit:String(Math.min(30,Math.max(1,Math.trunc(limit)))),
  offset:String(Math.min(10000,Math.max(0,Math.trunc(offset)))),
 });
 if(category&&safeSlug(category))params.set("category",category);
 if(tag&&safeSlug(tag))params.set("tag",tag);
 const response=await request<BlogList>("/articles?"+params.toString());
 if(!response.value||!Array.isArray(response.value.items)||typeof response.value.total!=="number")throw new JournalUnavailableError();
 // Defense in depth. Only published records are ever displayed or indexed.
 return {...response.value,items:response.value.items.filter(a=>a.status==="PUBLISHED"&&a.published_at)};
}

export async function getPublishedArticle(slug:string):Promise<BlogArticle|null>{
 if(!safeSlug(slug,140)||slug.length<3)return null;
 const response=await request<BlogArticle>("/articles/"+encodeURIComponent(slug));
 const a=response.value;
 return a?.status==="PUBLISHED"&&a.published_at?a:null;
}

export async function getJournalTaxonomy():Promise<{categories:BlogCategory[];tags:BlogTag[]}>{
 const [categories,tags]=await Promise.all([
  request<{items:BlogCategory[]}>("/categories"),
  request<{items:BlogTag[]}>("/tags"),
 ]);
 return {
  categories:Array.isArray(categories.value?.items)?categories.value.items:[],
  tags:Array.isArray(tags.value?.items)?tags.value.items:[],
 };
}

import type {JSONContent} from "@tiptap/core";

export type BlogStatus = "DRAFT" | "PUBLISHED";
export const EMPTY_DOCUMENT: JSONContent = {type:"doc",content:[{type:"paragraph"}]};

export type BlogCategory = {slug:string;name:string;description:string};
export type BlogTag = {slug:string;name:string};

export type BlogArticle = {
  id:string;
  slug:string;
  title:string;
  excerpt:string;
  category_slug:string;
  tag_slugs:string[];
  cover_image_url:string;
  cover_image_alt:string;
  seo_title:string;
  seo_description:string;
  og_image_url:string;
  status:BlogStatus;
  version:number;
  author_id:string;
  published_at:string | null;
  created_at:string;
  updated_at:string;
  content_json?:JSONContent;
};
export type BlogArticleInput = Pick<BlogArticle,
  "slug"|"title"|"excerpt"|"category_slug"|"tag_slugs"|"cover_image_url"|
  "cover_image_alt"|"seo_title"|"seo_description"|"og_image_url"|"status"> & {
    content_json:JSONContent;
    expected_version?:number;
  };

export type BlogList = {items:BlogArticle[];total:number;limit:number;offset:number};

export function blankBlogArticle():BlogArticleInput {
  return {slug:"",title:"",excerpt:"",category_slug:"",tag_slugs:[],
    cover_image_url:"",cover_image_alt:"",seo_title:"",seo_description:"",
    og_image_url:"",status:"DRAFT",content_json:EMPTY_DOCUMENT};
}
export function inputFromArticle(value:BlogArticle):BlogArticleInput {
  return {slug:value.slug,title:value.title,excerpt:value.excerpt,
    category_slug:value.category_slug,tag_slugs:value.tag_slugs??[],
    cover_image_url:value.cover_image_url,cover_image_alt:value.cover_image_alt,
    seo_title:value.seo_title,seo_description:value.seo_description,
    og_image_url:value.og_image_url,status:value.status,
    content_json:value.content_json??EMPTY_DOCUMENT,expected_version:value.version};
}
export function asSlug(value:string){
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/đ/g,"d").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,140);
}
export function isApprovedUrl(url:string){
  if(/^\/media\/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\.(?:jpg|png|webp)$/.test(url))return true;
  if(!url) return true;
  try {const parsed=new URL(url);return parsed.protocol==="https:"&&!parsed.username&&!parsed.password}
  catch {return false}
}
export function isApprovedLink(value:string){
  if(value.startsWith("/")&&!value.startsWith("//")&&!value.includes("\\"))return true;
  return isApprovedUrl(value) && value!=="";
}

// Serialize only the node attributes/marks that the Go content validator accepts.
// The API independently validates every document; browser-side cleaning is for
// Tiptap compatibility, not a substitute for server-side safety checks.
export function normalizeBlogDocument(document:JSONContent):JSONContent {
  const normalize=(node:JSONContent):JSONContent=>{
    const result:JSONContent={type:node.type};
    if(typeof node.text==="string")result.text=node.text;
    if(node.type==="heading" && [2,3,4].includes(Number(node.attrs?.level))){
      result.attrs={level:Number(node.attrs?.level)};
    }
    if(node.type==="orderedList"&&typeof node.attrs?.start==="number"){
      result.attrs={start:node.attrs.start};
    }
    if(node.type==="image"){
      result.attrs={src:String(node.attrs?.src??""),alt:String(node.attrs?.alt??"")};
    }
    if(node.marks?.length){
      result.marks=node.marks.map(mark=>mark.type==="link"?
        {type:"link",attrs:{href:String(mark.attrs?.href??"")}}:{type:mark.type});
    }
    if(node.content)result.content=node.content.map(normalize);
    return result;
  };
  return normalize(document);
}

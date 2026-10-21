import type {BlogArticle, BlogArticleInput, BlogList, BlogCategory, BlogTag, BlogStatus} from "@/lib/blog-types";

const base="/api/store/";
async function request<T>(path:string,method:"GET"|"POST"|"PUT"|"PATCH"|"DELETE"="GET",body?:unknown):Promise<T>{
  const res=await fetch(base+path,{method,cache:"no-store",
    headers:{"Content-Type":"application/json"},...(method==="GET"?{}:{body:JSON.stringify(body??{})})});
  if(res.status===401||res.status===403) throw new Error("Phiên đăng nhập hết hạn hoặc không có quyền Admin. Vui lòng đăng nhập lại.");
  if(res.status===409) throw new Error("Dữ liệu đã được thay đổi hoặc slug trùng. Hãy tải lại bài viết rồi thử tiếp.");
  const json=await res.json().catch(()=>null);
  if(!res.ok) throw new Error(json?.error??`Lỗi máy chủ (${res.status})`);
  return json as T;
}
export const journalApi={
  list:(status:"ALL"|BlogStatus="ALL",offset=0,limit=12)=>request<BlogList>(
    `admin/blog/articles?status=${status}&offset=${offset}&limit=${limit}`),
  get:(id:string)=>request<BlogArticle>(`admin/blog/articles/${id}`),
  categories:()=>request<{items:BlogCategory[]}>("blog/categories"),
  tags:()=>request<{items:BlogTag[]}>("blog/tags"),
  create:(body:BlogArticleInput)=>request<{id:string;version:number}>("admin/blog/articles","POST",body),
  update:(id:string,body:BlogArticleInput)=>request<{id:string;version:number}>(`admin/blog/articles/${id}`,"PUT",body),
  setStatus:(id:string,status:BlogStatus,expected_version:number)=>request<{version:number}>(
    `admin/blog/articles/${id}/status`,"PATCH",{status,expected_version}),
  archive:(id:string,expected_version:number)=>request<void>(
    `admin/blog/articles/${id}`,"DELETE",{expected_version}),
  addCategory:(body:{slug:string;name:string;description:string})=>request("admin/blog/categories","POST",body),
  addTag:(body:{slug:string;name:string})=>request("admin/blog/tags","POST",body),
};

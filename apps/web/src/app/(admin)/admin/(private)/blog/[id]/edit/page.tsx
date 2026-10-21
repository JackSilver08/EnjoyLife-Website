"use client";
import {useParams} from "next/navigation";
import Link from "next/link";
import {useAdminData} from "@/components/admin/admin-data";
import {JournalArticleForm} from "@/components/admin/journal-article-form";
import type {BlogArticle} from "@/lib/blog-types";

export default function EditJournalArticle(){
 const {id}=useParams<{id:string}>();
 const {data,loading,error,reload}=useAdminData<BlogArticle>("admin/blog/articles/"+id);
 if(loading)return <div className="cms-page"><h1>Đang tải nội dung...</h1></div>;
 if(error||!data)return <div className="cms-page">
  <h1>Không mở được bài viết</h1>
  <div className="admin-error" role="alert">{error||"Không tìm thấy bài viết."}</div>
  <button className="cms-secondary-action" type="button" onClick={()=>void reload()}>Thử tải lại</button>
  <Link className="cms-back" href="/admin/blog">Về danh sách</Link></div>;
 return <JournalArticleForm key={data.id} initial={data}/>;
}

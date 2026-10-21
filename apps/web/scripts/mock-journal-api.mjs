import http from "node:http";
const article={
 id:"00000000-0000-4000-8000-000000000042",
 slug:"sprint-4-test-article",
 title:"Bài viết kiểm thử Sprint 4",
 excerpt:"Đây là bài kiểm thử luồng đọc tin thời trang được lấy từ API.",
 category_slug:"phong-cach",tag_slugs:["toi-gian"],
 cover_image_url:"",cover_image_alt:"",
 seo_title:"SEO Title kiểm thử Sprint 4",
 seo_description:"SEO Description kiểm thử dữ liệu động từ hệ thống.",
 og_image_url:"",status:"PUBLISHED",version:1,
 author_id:"00000000-0000-4000-8000-000000000001",
 published_at:"2026-10-20T08:00:00Z",
 created_at:"2026-10-20T08:00:00Z",
 updated_at:"2026-10-20T09:00:00Z",
 content_json:{type:"doc",content:[{type:"heading",attrs:{level:2},content:[{type:"text",text:"Nội dung từ API"}]},{type:"paragraph",content:[{type:"text",text:"Chi tiết bài viết thực sự lấy từ API, không phải giao diện hardcode."}]}]},
};
const serve=(res,code,payload)=>{
 res.writeHead(code,{"Content-Type":"application/json; charset=utf-8"});
 res.end(JSON.stringify(payload));
};
http.createServer((req,res)=>{
 const url=new URL(req.url??"/","http://localhost");
 const path=url.pathname;
 if(path==="/api/v1/products"){serve(res,200,{items:[]});return;}
 if(path==="/api/v1/auth/me"){serve(res,200,{user:null});return;}
 if(path==="/api/v1/blog/categories"){serve(res,200,{items:[{slug:"phong-cach",name:"Phong cách",description:""}]});return;}
 if(path==="/api/v1/blog/tags"){serve(res,200,{items:[{slug:"toi-gian",name:"Tối giản"}]});return;}
 if(path==="/api/v1/blog/articles"){
  let items=[article];
  if(url.searchParams.get("category")&&url.searchParams.get("category")!=="phong-cach")items=[];
  if(url.searchParams.get("tag")&&url.searchParams.get("tag")!=="toi-gian")items=[];
  const total=items.length;
  const offset=Number(url.searchParams.get("offset")||"0");
  const limit=Number(url.searchParams.get("limit")||"12");
  serve(res,200,{items:items.slice(offset,offset+limit).map(({content_json,...rest})=>rest),total,offset,limit});
  return;
 }
 if(path==="/api/v1/blog/articles/"+article.slug){serve(res,200,article);return;}
 if(path.startsWith("/api/v1/blog/articles/")){serve(res,404,{error:"Not found"});return;}
 if(path==="/api/v1/health"){serve(res,200,{status:"ok"});return;}
 if(path.startsWith("/api/v1/admin/")||path.startsWith("/api/v1/auth/")){serve(res,401,{error:"Unauthorized"});return;}
 serve(res,404,{error:"Not found"});
}).listen(8081,"127.0.0.1",()=>console.log("Journal CI API fixture on 127.0.0.1:8081"));

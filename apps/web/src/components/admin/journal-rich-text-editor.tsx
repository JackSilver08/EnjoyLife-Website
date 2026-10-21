"use client";
import {useState} from "react";
import {EditorContent,useEditor} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import type {JSONContent} from "@tiptap/core";
import {Bold,Italic,Underline,Strikethrough,Heading2,Heading3,List,ListOrdered,Quote,Link2,
  ImagePlus,Undo2,Redo2,Minus,Unlink} from "lucide-react";
import {isApprovedLink,isApprovedUrl,normalizeBlogDocument} from "@/lib/blog-types";
import {MediaPicker} from "@/components/admin/media-picker";

type Props={initial:JSONContent;onChange:(data:JSONContent)=>void;disabled?:boolean};
export function JournalRichTextEditor({initial,onChange,disabled}:Props){
  const [imageMode,setImageMode]=useState(false);
  const [imageURL,setImageURL]=useState("");
  const [imageAlt,setImageAlt]=useState("");
  const [message,setMessage]=useState("");
  const editor=useEditor({
    extensions:[
      StarterKit.configure({
        heading:{levels:[2,3,4]},
        link:{openOnClick:false,autolink:false,linkOnPaste:false,defaultProtocol:"https"},
        codeBlock:false,
      }),
      Image.configure({inline:false,allowBase64:false}),
    ],
    content:initial,
    immediatelyRender:false,
    editable:!disabled,
    editorProps:{attributes:{class:"cms-prosemirror",role:"textbox","aria-label":"Nội dung bài viết","aria-multiline":"true"}},
    onUpdate:({editor:instance})=>onChange(normalizeBlogDocument(instance.getJSON())),
  });
  function editLink(){
    if(!editor)return;
    const current=String(editor.getAttributes("link").href??"");
    const value=window.prompt("Dán URL https:// hoặc đường dẫn nội bộ /...",current);
    if(value===null)return;
    const trimmed=value.trim();
    if(!trimmed){editor.chain().focus().unsetLink().run();setMessage("");return;}
    if(!isApprovedLink(trimmed)){setMessage("Liên kết chỉ được dùng HTTPS hoặc đường dẫn nội bộ bắt đầu bằng /.");return;}
    editor.chain().focus().setLink({href:trimmed}).run();
    setMessage("");
  }
  function insertImage(){
    if(!editor)return;
    const url=imageURL.trim(),alt=imageAlt.trim();
    if(!url||!isApprovedUrl(url)){setMessage("Chọn ảnh từ máy / thư viện hoặc URL HTTPS hợp lệ.");return;}
    if(!alt){setMessage("Hình ảnh bắt buộc có mô tả alt.");return;}
    editor.chain().focus().setImage({src:url,alt}).run();
    setImageURL("");setImageAlt("");setImageMode(false);setMessage("");
  }
  const action=(label:string,Icon:typeof Bold,onClick:()=>void,pressed=false,off=false)=>(
    <button key={label} type="button" title={label} aria-label={label} aria-pressed={pressed}
      disabled={!editor||disabled||off} onClick={onClick}><Icon size={17}/></button>
  );
  return <div className="cms-rich-editor">
    <div className="cms-editor-toolbar" role="toolbar" aria-label="Định dạng bài viết">
      {action("In đậm",Bold,()=>editor?.chain().focus().toggleBold().run(),editor?.isActive("bold")??false)}
      {action("In nghiêng",Italic,()=>editor?.chain().focus().toggleItalic().run(),editor?.isActive("italic")??false)}
      {action("Gạch chân",Underline,()=>editor?.chain().focus().toggleUnderline().run(),editor?.isActive("underline")??false)}
      {action("Gạch ngang",Strikethrough,()=>editor?.chain().focus().toggleStrike().run(),editor?.isActive("strike")??false)}
      <span className="cms-toolbar-separator"/>
      {action("Tiêu đề H2",Heading2,()=>editor?.chain().focus().toggleHeading({level:2}).run(),editor?.isActive("heading",{level:2})??false)}
      {action("Tiêu đề H3",Heading3,()=>editor?.chain().focus().toggleHeading({level:3}).run(),editor?.isActive("heading",{level:3})??false)}
      {action("Danh sách",List,()=>editor?.chain().focus().toggleBulletList().run(),editor?.isActive("bulletList")??false)}
      {action("Danh sách đánh số",ListOrdered,()=>editor?.chain().focus().toggleOrderedList().run(),editor?.isActive("orderedList")??false)}
      {action("Trích dẫn",Quote,()=>editor?.chain().focus().toggleBlockquote().run(),editor?.isActive("blockquote")??false)}
      {action("Đường phân cách",Minus,()=>editor?.chain().focus().setHorizontalRule().run())}
      <span className="cms-toolbar-separator"/>
      {action("Chèn liên kết",Link2,editLink)}
      {action("Gỡ liên kết",Unlink,()=>editor?.chain().focus().unsetLink().run(),false,!editor?.isActive("link"))}
      {action("Chèn ảnh từ máy hoặc URL",ImagePlus,()=>setImageMode(v=>!v))}
      <span className="cms-toolbar-separator"/>
      {action("Hoàn tác",Undo2,()=>editor?.chain().focus().undo().run())}
      {action("Làm lại",Redo2,()=>editor?.chain().focus().redo().run())}
    </div>
    {imageMode&&<div className="cms-image-form" role="group" aria-label="Chèn hình ảnh">
      <div className="admin-wide"><MediaPicker compact label="Chọn ảnh từ máy hoặc thư viện" value={imageURL} onSelect={setImageURL} onUpload={asset=>{if(!imageAlt)setImageAlt(asset.original_name.replace(/\\.[^.]+$/,""))}}/></div><label>URL ảnh<input value={imageURL} placeholder="https://... hoặc /media/..." onChange={e=>setImageURL(e.target.value)}/></label>
      <label>Alt text mô tả ảnh<input value={imageAlt} maxLength={200} placeholder="Mô tả nội dung ảnh" onChange={e=>setImageAlt(e.target.value)}/></label>
      <button type="button" disabled={!editor||disabled} onClick={insertImage}>Chèn ảnh</button>
      <button type="button" className="cms-plain-button" onClick={()=>setImageMode(false)}>Đóng</button>
    </div>}
    {message&&<p className="cms-field-error" role="alert">{message}</p>}
    <EditorContent editor={editor}/>
    <p className="cms-editor-hint">Dùng H2–H4 cho đề mục. Ảnh có thể được tải trực tiếp từ máy lên thư viện Media, sau đó chèn kèm alt text.</p>
  </div>;
}

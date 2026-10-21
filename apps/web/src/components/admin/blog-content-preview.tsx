import type {ReactNode} from "react";
import type {JSONContent} from "@tiptap/core";
import {isApprovedLink,isApprovedUrl} from "@/lib/blog-types";

function decorate(content:ReactNode,marks:JSONContent["marks"],key:string):ReactNode{
  let result=content;
  for(const mark of marks??[]){
    if(mark.type==="bold") result=<strong key={key+"-bold"}>{result}</strong>;
    if(mark.type==="italic") result=<em key={key+"-italic"}>{result}</em>;
    if(mark.type==="underline")result=<u key={key+"-underline"}>{result}</u>;
    if(mark.type==="strike")result=<s key={key+"-strike"}>{result}</s>;
    if(mark.type==="code")result=<code key={key+"-code"}>{result}</code>;
    if(mark.type==="link"&&typeof mark.attrs?.href==="string"&&isApprovedLink(mark.attrs.href)){
      result=<a key={key+"-link"} href={mark.attrs.href} rel="noopener noreferrer" target="_blank">{result}</a>;
    }
  }
  return result;
}
function render(node:JSONContent,key:string,depth:number):ReactNode{
  if(depth>20) return null;
  const kids=(node.content??[]).map((child,i)=>render(child,key+"-"+i,depth+1));
  switch(node.type){
    case "doc":return <div key={key} className="cms-preview-content">{kids}</div>;
    case "text":return <span key={key}>{decorate(node.text??"",node.marks,key)}</span>;
    case "paragraph":return <p key={key}>{kids}</p>;
    case "heading":{
      const level=Number(node.attrs?.level);
      if(level===2)return <h2 key={key}>{kids}</h2>;
      if(level===3)return <h3 key={key}>{kids}</h3>;
      return <h4 key={key}>{kids}</h4>;
    }
    case "bulletList":return <ul key={key}>{kids}</ul>;
    case "orderedList":return <ol key={key}>{kids}</ol>;
    case "listItem":return <li key={key}>{kids}</li>;
    case "blockquote":return <blockquote key={key}>{kids}</blockquote>;
    case "hardBreak":return <span key={key} className="cms-linebreak">{"\n"}</span>;
    case "horizontalRule":return <hr key={key}/>;
    case "codeBlock":return <pre key={key}><code>{(node.content??[]).map(child=>child.text??"").join("")}</code></pre>;
    case "image":{
      const url=String(node.attrs?.src??"");
      const alt=String(node.attrs?.alt??"");
      if(!isApprovedUrl(url)||!url||!alt)return null;
      // Admin preview only: final storefront article renderer is scheduled for Sprint 4.
      // eslint-disable-next-line @next/next/no-img-element
      return <figure key={key}><img src={url} alt={alt} loading="lazy"/><figcaption>{alt}</figcaption></figure>;
    }
    default:return null;
  }
}
export function BlogContentPreview({content}:{content:JSONContent}){
  return render(content,"root",0);
}

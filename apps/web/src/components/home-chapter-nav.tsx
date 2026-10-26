"use client";

import {useEffect,useState} from "react";

const chapters = [
  {id:"home-top",label:"Mở đầu"},
  {id:"our-story",label:"Câu chuyện"},
  {id:"featured-products",label:"Sản phẩm"},
  {id:"lookbook",label:"Lookbook"},
  {id:"journal",label:"Journal"},
  {id:"contact",label:"Liên hệ"}
];

export function HomeChapterNav({hasLookbook}:{hasLookbook:boolean}) {
  const [active,setActive] = useState("home-top");
  const entries = chapters.filter(item=>hasLookbook||item.id!=="lookbook");

  useEffect(()=>{
    let frame=0;
    const update=()=>{
      frame=0;
      const line=window.innerHeight*0.36;
      let current="home-top";
      for(const chapter of entries) {
        const section=document.getElementById(chapter.id);
        if(section&&section.getBoundingClientRect().top<=line) current=chapter.id;
      }
      setActive(previous=>previous===current?previous:current);
    };
    const onScroll=()=>{if(!frame)frame=window.requestAnimationFrame(update);};
    window.addEventListener("scroll",onScroll,{passive:true});
    window.addEventListener("resize",onScroll);
    update();
    return ()=>{window.removeEventListener("scroll",onScroll);window.removeEventListener("resize",onScroll);if(frame)window.cancelAnimationFrame(frame);};
  },[hasLookbook]); // Fixed chapter definitions, only the optional Lookbook varies.

  return <nav className="home-chapters" aria-label="Điều hướng các phần trang chủ">
    <div className="home-chapters-inner page-shell">
      <span className="home-chapters-brand" aria-hidden="true">ENJOY / EDITION 02</span>
      <div className="home-chapters-links">
        {entries.map((chapter,index)=><a key={chapter.id} href={`#${chapter.id}`}
          className={active===chapter.id?"is-active":""}
          aria-current={active===chapter.id?"location":undefined}>
          <span className="home-chapters-number">{String(index+1).padStart(2,"0")}</span>
          {chapter.label}
        </a>)}
      </div>
      <span className="home-chapters-progress" aria-label={`Đang xem: ${entries.find(c=>c.id===active)?.label??"Mở đầu"}`}>
        {String(Math.max(1,entries.findIndex(c=>c.id===active)+1)).padStart(2,"0")} / {String(entries.length).padStart(2,"0")}
      </span>
    </div>
  </nav>;
}

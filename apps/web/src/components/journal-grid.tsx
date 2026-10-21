import type {BlogArticle} from "@/lib/blog-types";
import {JournalCard} from "@/components/journal-card";
export function JournalGrid({items}:{items:BlogArticle[]}){
 return <div className="journal-articles-grid">{items.map((item,index)=><JournalCard key={item.id} article={item} index={index}/>)}</div>;
}

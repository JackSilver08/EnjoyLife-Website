export type CSVProduct={
 name:string;slug:string;description:string;image_url:string;collection:string;
 category:string;sku:string;color:string;size:string;price_vnd:number;opening_stock:number;published:false;
};
const fields=["name","slug","description","category","collection","sku","color","size","price_vnd","opening_stock","image_url"] as const;
// RFC4180-compatible enough for CSV exports with quoted commas, quoted line breaks and escaped quotes.
export function parseCSV(text:string):CSVProduct[]{
 const cells:string[][]=[];let row:string[]=[],field="",quoted=false;
 const src=text.replace(/^\uFEFF/,"").replace(/\r\n/g,"\n");
 for(let i=0;i<src.length;i++){
  const c=src[i];
  if(quoted){
   if(c==='"'&&src[i+1]==='"'){field+='"';i++}
   else if(c==='"')quoted=false;
   else field+=c;
  }else{
   if(c==='"')quoted=true;
   else if(c===","){row.push(field);field=""}
   else if(c==="\n"){row.push(field);cells.push(row);row=[];field=""}
   else field+=c;
  }
 }
 if(quoted)throw Error("File CSV có dấu ngoặc kép chưa đóng.");
 if(field!==""||row.length){row.push(field);cells.push(row)}
 const head=cells.shift()?.map(v=>v.trim());
 if(!head||fields.some(f=>!head.includes(f)))throw Error("CSV thiếu cột bắt buộc. Hãy dùng đúng file mẫu.");
 if(cells.length>100)throw Error("Chỉ nhập tối đa 100 sản phẩm/lần.");
 return cells.filter(line=>line.some(cell=>cell.trim())).map((line,i)=>{
  const get=(name:typeof fields[number])=>line[head.indexOf(name)]?.trim()??"";
  const price=Number(get("price_vnd")),stock=Number(get("opening_stock"));
  if(!Number.isSafeInteger(price)||price<1||!Number.isSafeInteger(stock)||stock<0)throw Error("Giá hoặc số lượng không hợp lệ ở dòng "+(i+2));
  return {name:get("name"),slug:get("slug"),description:get("description"),image_url:get("image_url"),
   category:get("category"),collection:get("collection"),sku:get("sku"),color:get("color"),
   size:get("size"),price_vnd:price,opening_stock:stock,published:false};
 });
}
export const CSV_TEMPLATE="name,slug,description,category,collection,sku,color,size,price_vnd,opening_stock,image_url\n"+
'"Áo sơ mi thật","ao-so-mi-moi","Áo sơ mi phom suông","ao","Everyday","EL-SHIRT-001","Trắng","M",329000,10,""\n';

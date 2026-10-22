// Browser-side optimisation for images selected in the product gallery.
// The API still validates the actual file bytes, dimensions and MIME type.
export async function optimizeProductImage(file:File):Promise<File>{
 if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw Error("Chỉ hỗ trợ JPG, PNG hoặc WebP.");
 if(file.size>20*1024*1024)throw Error("Ảnh gốc vượt giới hạn 20 MB.");
 if(typeof createImageBitmap!=="function")return file;
 let bitmap:ImageBitmap|undefined;
 try{
  bitmap=await createImageBitmap(file);
  if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>32_000_000)throw Error("Kích thước ảnh vượt giới hạn.");
  const maxDimension=1600;
  const scale=Math.min(1,maxDimension/Math.max(bitmap.width,bitmap.height));
  const width=Math.max(1,Math.round(bitmap.width*scale));
  const height=Math.max(1,Math.round(bitmap.height*scale));
  const canvas=document.createElement("canvas");
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext("2d");
  if(!ctx)return file;
  ctx.drawImage(bitmap,0,0,width,height);
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/webp",.82));
  if(!blob||blob.type!=="image/webp"||blob.size>=file.size)return file;
  return new File([blob],file.name.replace(/\.[^.]+$/,"")+".webp",{type:"image/webp"});
 }catch(e){
  if(e instanceof Error&&e.message.includes("giới hạn"))throw e;
  return file;
 }finally{bitmap?.close()}
}

"use client";
import {useCallback,useEffect,useState} from "react";
export function useAdminData<T>(path:string){
 const [data,setData]=useState<T|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState("");
 const reload=useCallback(async()=>{
  setLoading(true);setError("");
  try{const res=await fetch("/api/store/"+path,{cache:"no-store"});const result=await res.json();if(!res.ok)throw new Error(result.error||"Không thể tải dữ liệu.");setData(result as T)}
  catch(e){setError(e instanceof Error?e.message:"Lỗi kết nối.");setData(null)}
  finally{setLoading(false)}
 },[path]);
 useEffect(()=>{const timer=window.setTimeout(()=>{void reload()},0);return()=>window.clearTimeout(timer)},[reload]);
 return {data,loading,error,reload};
}
export async function adminAction(path:string,method:"POST"|"PATCH",body?:unknown){
 const response=await fetch("/api/store/"+path,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body??{})});
 const payload=await response.json();
 if(!response.ok)throw new Error(payload.error||"Thao tác thất bại.");
 return payload;
}
export const moneyVND=(amount:number)=>new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND",maximumFractionDigits:0}).format(amount);

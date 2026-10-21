"use client";
import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {LockKeyhole,ArrowRight} from "lucide-react";
export default function AdminLogin(){
 const router=useRouter();const [username,setUsername]=useState("");const [password,setPassword]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");
  try{
   const r=await fetch("/api/store/auth/admin-demo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,password})});
   const data=await r.json();
   if(!r.ok||data.user?.role!=="ADMIN")throw new Error(data.error||"Không thể đăng nhập.");
   router.replace("/admin");router.refresh();
  }catch(err){setError(err instanceof Error?err.message:"Máy chủ không khả dụng.")}finally{setBusy(false)}
 }
 return <main className="admin-login-page"><section className="admin-login-card">
  <Link className="brand" href="/">enjoy<span>life</span></Link><span className="eyebrow">QUẢN TRỊ CỬA HÀNG</span>
  <h1>Chào mừng<br/><em>trở lại.</em></h1><p>Đăng nhập để theo dõi đơn hàng, sản phẩm và tồn kho.</p>
  <form onSubmit={submit}><label htmlFor="login-user">Tên đăng nhập</label><input id="login-user" autoComplete="username" required value={username} onChange={e=>setUsername(e.target.value)}/>
   <label htmlFor="login-pass">Mật khẩu</label><input id="login-pass" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/>
   {error&&<p className="form-error" role="alert">{error}</p>}
   <button type="submit" className="button-dark full-width" disabled={busy}><LockKeyhole size={17}/>{busy?"ĐANG KIỂM TRA...":"ĐĂNG NHẬP"}<ArrowRight size={17}/></button>
  </form><small>Tài khoản thử nghiệm chỉ được bật trên localhost trong chế độ development.</small>
 </section></main>;
}

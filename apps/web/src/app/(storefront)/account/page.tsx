"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus, LogOut, ShieldCheck } from "lucide-react";
import { money } from "@/lib/format";

type User={id:string;email:string;name:string;role:string};
type Order={order_no:string;status:string;payment_status:string;total_vnd:number;created_at:string};
export default function AccountPage(){
 const router=useRouter(); const [user,setUser]=useState<User|null|undefined>(undefined); const [orders,setOrders]=useState<Order[]>([]); const [mode,setMode]=useState<"login"|"register">("login"); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
 const load=async()=>{const r=await fetch("/api/store/auth/me",{cache:"no-store"});const d=await r.json();setUser(d.user);if(d.user){const o=await fetch("/api/store/account/orders");if(o.ok)setOrders((await o.json()).items)}};
 useEffect(()=>{const timer=window.setTimeout(()=>{void load()},0);return()=>window.clearTimeout(timer)},[]);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");const f=new FormData(e.currentTarget);const body={email:String(f.get("email")||""),password:String(f.get("password")||""),name:String(f.get("name")||"")};try{const r=await fetch(`/api/store/auth/${mode==="login"?"login":"register"}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error);setUser(d.user);setOrders([]);if(d.user.role==="ADMIN")router.push("/admin");else void load()}catch(e){setError(e instanceof Error?e.message:"Không thể thực hiện yêu cầu.")}finally{setBusy(false)}}
 async function logout(){await fetch("/api/store/auth/logout",{method:"POST"});setUser(null);setOrders([]);router.refresh()}
 if(user===undefined)return <div className="page-shell account-page">Đang tải tài khoản...</div>;
 if(user)return <div className="page-shell account-page"><span className="eyebrow">TÀI KHOẢN / ENJOY LIFE</span><div className="account-head"><div><h1>Xin chào,<br/><em>{user.name}.</em></h1><p>{user.email}</p></div><button className="text-button" onClick={logout}><LogOut size={16}/> Đăng xuất</button></div>{user.role==="ADMIN"&&<Link className="button-dark" href="/admin"><ShieldCheck size={17}/> ĐẾN TRANG QUẢN TRỊ</Link>}<h2>Đơn hàng của tôi</h2>{orders.length?<div className="account-orders">{orders.map(o=><article key={o.order_no}><strong>{o.order_no}</strong><span>Chờ xác nhận · Chưa thanh toán</span><b>{money(o.total_vnd)}</b></article>)}</div>:<div className="empty-state">Bạn chưa có đơn hàng nào. <Link href="/shop">Khám phá sản phẩm ↗</Link></div>}</div>;
 return <div className="page-shell account-page"><span className="eyebrow">TÀI KHOẢN / ENJOY LIFE</span><h1>{mode==="login"?<>Chào mừng<br/><em>trở lại.</em></>:<>Tạo tài khoản<br/><em>của bạn.</em></>}</h1><div className="account-card"><div className="account-tabs"><button className={mode==="login"?"active":""} onClick={()=>setMode("login")}><LogIn size={16}/> Đăng nhập</button><button className={mode==="register"?"active":""} onClick={()=>setMode("register")}><UserPlus size={16}/> Đăng ký</button></div><form onSubmit={submit}>{mode==="register"&&<label>Họ và tên<input name="name" required minLength={2}/></label>}<label>Email<input name="email" type="email" required autoComplete="email"/></label><label>Mật khẩu<input name="password" type="password" required minLength={8} autoComplete={mode==="login"?"current-password":"new-password"}/></label>{error&&<p className="form-error">{error}</p>}<button className="button-dark full-width" disabled={busy}>{busy?"ĐANG XỬ LÝ...":mode==="login"?"ĐĂNG NHẬP":"TẠO TÀI KHOẢN"}</button></form></div></div>
}

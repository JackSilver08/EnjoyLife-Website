"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Boxes, ClipboardList, BarChart3, ShieldAlert, LayoutDashboard, ArrowUpRight } from "lucide-react";
const sections=[{icon:ClipboardList,title:"Đơn hàng",detail:"Chờ xây dựng quy trình xác nhận và xử lý"},{icon:Package,title:"Sản phẩm",detail:"Sẽ kết nối CRUD sau khi có phân quyền"},{icon:Boxes,title:"Kho hàng",detail:"Cần kiểm soát xuất, nhập và đối soát"},{icon:BarChart3,title:"Báo cáo",detail:"Phân biệt tổng giá trị đơn và doanh thu thực"}];
export default function AdminPage(){
  const router=useRouter(); const [ready,setReady]=useState(false); const [orders,setOrders]=useState<Array<{order_no:string;customer_name:string;total_vnd:number}>>([]); const [users,setUsers]=useState<Array<{id:string;name:string;email:string;role:string}>>([]);
  useEffect(()=>{void (async()=>{try{const me=await fetch("/api/store/auth/me",{cache:"no-store"});const user=(await me.json()).user;if(!user||user.role!=="ADMIN"){router.replace("/account");return}const [orderResult,userResult]=await Promise.all([fetch("/api/store/admin/orders"),fetch("/api/store/admin/users")]);if(orderResult.ok)setOrders((await orderResult.json()).items);if(userResult.ok)setUsers((await userResult.json()).items)}finally{setReady(true)}})()},[router]);
  if(!ready)return <div className="admin-root"><main className="admin-workspace">Đang xác thực quyền quản trị...</main></div>;
  return <div className="admin-frame">
    <aside className="admin-sidebar"><Link className="brand" href="/">enjoy<span>life</span></Link><span className="eyebrow">QUẢN TRỊ / BẢN DEMO</span><nav aria-label="Phân hệ quản trị"><div className="admin-nav-active"><LayoutDashboard size={18}/> Tổng quan</div>{sections.map(s=><div key={s.title} className="admin-nav-disabled"><s.icon size={18}/>{s.title}<span>·</span></div>)}</nav><Link href="/" className="admin-back">VỀ TRANG CHỦ <ArrowUpRight size={16}/></Link></aside>
    <main className="admin-workspace"><div className="admin-top"><span className="eyebrow">ENJOY LIFE / OPERATIONS</span><span className="admin-demo-label">DEMO KHÔNG DÙNG DỮ LIỆU THẬT</span></div>
      <h1>Tổng quan cửa hàng</h1><p className="admin-subtitle">Không gian làm việc cho vận hành bán hàng, kho và trợ lý AI.</p>
      <div className="admin-banner"><ShieldAlert size={20}/><p>Chỉ tài khoản quản trị mới xem được dữ liệu đơn hàng. Thanh toán trực tuyến và các thao tác chỉnh sửa vẫn chưa được kích hoạt.</p></div>
      <div className="admin-kpi-v2">{["Đơn chờ xác nhận","Tài khoản đã đăng ký","SKU sắp hết","Yêu cầu đổi trả"].map((x,i)=><div key={x} className="admin-metric"><span>{x}</span><strong>{i===0?orders.length:i===1?users.length:"—"}</strong><small>{i<2?"Dữ liệu hiện có trong hệ thống":"Đang phát triển"}</small></div>)}</div>
      <div className="admin-panel-grid"><section><h2>Đơn hàng gần đây</h2>{orders.length?orders.map(o=><div className="admin-order" key={o.order_no}><strong>{o.order_no}</strong><span>{o.customer_name}</span><b>{o.total_vnd.toLocaleString("vi-VN")} ₫</b></div>):<div className="admin-empty">Chưa có đơn hàng nào.</div>}</section><section><h2>Người dùng</h2>{users.length?users.map(u=><div className="admin-order" key={u.id}><strong>{u.name}</strong><span>{u.email}</span><b>{u.role==="ADMIN"?"Quản trị":"Khách hàng"}</b></div>):<div className="admin-empty">Chưa có tài khoản nào.</div>}</section></div>
    </main></div>;
}

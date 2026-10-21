"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {LayoutDashboard,ClipboardList,Package,Boxes,Users,BarChart3,Newspaper,Images,Palette,LogOut,ArrowUpRight} from "lucide-react";
const nav=[{href:"/admin",label:"Tổng quan",icon:LayoutDashboard},{href:"/admin/orders",label:"Đơn hàng",icon:ClipboardList},{href:"/admin/products",label:"Sản phẩm",icon:Package},{href:"/admin/inventory",label:"Kho hàng",icon:Boxes},{href:"/admin/customers",label:"Khách hàng",icon:Users},{href:"/admin/reports",label:"Báo cáo",icon:BarChart3},{href:"/admin/blog",label:"Enjoy Journal",icon:Newspaper},{href:"/admin/media",label:"Thư viện ảnh",icon:Images},{href:"/admin/site",label:"Giao diện website",icon:Palette}];
export function AdminShell({children,name}:{children:React.ReactNode;name:string}){
 const pathname=usePathname();const router=useRouter();
 async function logout(){await fetch("/api/store/auth/logout",{method:"POST"});router.replace("/account");router.refresh()}
 return <div className="admin-frame"><aside className="admin-sidebar"><Link className="brand" href="/">enjoy<span>life</span></Link><span className="eyebrow">TRUNG TÂM QUẢN TRỊ</span>
  <nav aria-label="Điều hướng quản trị">{nav.map(item=><Link key={item.href} href={item.href} className={pathname===item.href||pathname.startsWith(item.href+"/")?"admin-nav-active":"admin-nav-item"} aria-current={pathname===item.href?"page":undefined}><item.icon size={18}/>{item.label}</Link>)}</nav>
  <div className="admin-sidebar-bottom"><span>{name}</span><button onClick={logout} type="button"><LogOut size={16}/> Đăng xuất</button><Link className="admin-back" href="/">VỀ CỬA HÀNG <ArrowUpRight size={16}/></Link></div>
 </aside><div className="admin-main"><header className="admin-topbar"><strong>Enjoy Life / Operations</strong><span>{name}</span></header><main className="admin-workspace">{children}</main></div></div>;
}

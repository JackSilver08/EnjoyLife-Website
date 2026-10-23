"use client";
import Link from "next/link";
import {AdminToastProvider} from "@/components/admin/admin-toast";
import {usePathname,useRouter} from "next/navigation";
import {createContext,useContext,useEffect} from "react";
import {LayoutDashboard,ClipboardList,Package,Boxes,Users,BarChart3,Newspaper,Images,Palette,LogOut,ArrowUpRight,ShieldCheck,LockKeyhole,Truck,ChartNoAxesCombined} from "lucide-react";
type Role="ADMIN"|"STAFF";
const RoleContext=createContext<Role>("ADMIN");
export function useAdminRole(){return useContext(RoleContext)}
const adminNav=[
 {href:"/admin",label:"Tổng quan",icon:LayoutDashboard},
 {href:"/admin/orders",label:"Đơn hàng",icon:ClipboardList},
 {href:"/admin/products",label:"Sản phẩm",icon:Package},
 {href:"/admin/inventory",label:"Kho hàng",icon:Boxes},
 {href:"/admin/warehouse",label:"Phiếu nhập & NCC",icon:Truck},
 {href:"/admin/warehouse/insights",label:"Phân tích tồn kho",icon:ChartNoAxesCombined},
 {href:"/admin/customers",label:"Khách hàng",icon:Users},
 {href:"/admin/staff",label:"Nhân viên & quyền",icon:ShieldCheck},
 {href:"/admin/reports",label:"Báo cáo",icon:BarChart3},
 {href:"/admin/blog",label:"Enjoy Journal",icon:Newspaper},
 {href:"/admin/media",label:"Thư viện ảnh",icon:Images},
 {href:"/admin/site",label:"Giao diện website",icon:Palette},
 {href:"/admin/security",label:"Bảo mật tài khoản",icon:LockKeyhole}
];
const staffNav=[
 {href:"/admin/orders",label:"Xử lý đơn hàng",icon:ClipboardList},
 {href:"/admin/catalog",label:"Tra cứu sản phẩm",icon:Package},
 {href:"/admin/inventory",label:"Quản lý kho",icon:Boxes},
 {href:"/admin/security",label:"Bảo mật tài khoản",icon:LockKeyhole}
];
const staffPaths=["/admin/orders","/admin/catalog","/admin/inventory","/admin/security"];
export function AdminShell({children,name,role}:{children:React.ReactNode;name:string;role:Role}){
 const pathname=usePathname();const router=useRouter();
 const allowed=role==="ADMIN"||staffPaths.some(p=>pathname===p||pathname.startsWith(p+"/"));
 useEffect(()=>{if(role==="STAFF"&&pathname==="/admin")router.replace("/admin/orders")},[role,pathname,router]);
 async function logout(){const res=await fetch("/api/store/auth/logout",{method:"POST"});if(res.ok){router.replace("/account");router.refresh()}}
 const nav=role==="ADMIN"?adminNav:staffNav;
 return <RoleContext.Provider value={role}><AdminToastProvider><div className="admin-frame"><aside className="admin-sidebar"><Link className="brand" href="/">enjoy<span>life</span></Link><span className="eyebrow">{role==="STAFF"?"KHU VỰC NHÂN VIÊN":"TRUNG TÂM QUẢN TRỊ"}</span>
  <nav aria-label="Điều hướng quản trị">{nav.map(item=><Link key={item.href} href={item.href} className={pathname===item.href||pathname.startsWith(item.href+"/")?"admin-nav-active":"admin-nav-item"} aria-current={pathname===item.href?"page":undefined}><item.icon size={18}/>{item.label}</Link>)}</nav>
  <div className="admin-sidebar-bottom"><span>{name} · {role==="STAFF"?"Nhân viên":"Quản trị viên"}</span><button onClick={()=>void logout()} type="button"><LogOut size={16}/> Đăng xuất</button><Link className="admin-back" href="/">VỀ CỬA HÀNG <ArrowUpRight size={16}/></Link></div>
 </aside><div className="admin-main"><header className="admin-topbar"><strong>Enjoy Life / {role==="STAFF"?"Staff":"Operations"}</strong><span>{name}</span></header><main className="admin-workspace">{allowed?children:<section className="admin-surface" role="alert"><h1>Không có quyền truy cập</h1><p>Tài khoản nhân viên chỉ được sử dụng các trang đã cấp quyền.</p><Link className="button-dark" href="/admin/orders">VỀ ĐƠN HÀNG</Link></section>}</main></div></div></AdminToastProvider></RoleContext.Provider>;
}

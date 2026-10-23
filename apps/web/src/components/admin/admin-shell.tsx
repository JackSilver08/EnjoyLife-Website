"use client";
import Link from "next/link";
import {AdminToastProvider} from "@/components/admin/admin-toast";
import {AdminFlyoutNav,type FlyoutNavGroup} from "@/components/admin/admin-flyout-nav";
import {usePathname,useRouter} from "next/navigation";
import {createContext,useContext,useEffect} from "react";
import {LayoutDashboard,ClipboardList,Package,Boxes,Users,BarChart3,Newspaper,Images,Palette,LogOut,ArrowUpRight,ShieldCheck,LockKeyhole,Sparkles,FolderClosed} from "lucide-react";

type Role="ADMIN"|"STAFF";
type NavItem={href:string;label:string;icon:typeof LayoutDashboard};

const RoleContext=createContext<Role>("ADMIN");
export function useAdminRole(){return useContext(RoleContext)}

// Six frequently used areas stay visible; secondary tools share one flyout.
// Retired procurement and return screens are no longer exposed in Admin.
const primaryNav:NavItem[]=[
 {href:"/admin",label:"Tổng quan",icon:LayoutDashboard},
 {href:"/admin/orders",label:"Đơn hàng",icon:ClipboardList},
 {href:"/admin/products",label:"Sản phẩm",icon:Package},
 {href:"/admin/inventory",label:"Kho hàng",icon:Boxes},
 {href:"/admin/customers",label:"Khách hàng",icon:Users},
 {href:"/admin/warehouse/insights",label:"AI & Phân tích",icon:Sparkles}
];
const secondaryNav:FlyoutNavGroup[]=[
 {id:"management",label:"Quản lý khác",icon:FolderClosed,items:[
  {href:"/admin/staff",label:"Nhân viên & quyền",icon:ShieldCheck},
  {href:"/admin/reports",label:"Báo cáo",icon:BarChart3},
  {href:"/admin/blog",label:"Enjoy Journal",icon:Newspaper},
  {href:"/admin/media",label:"Thư viện ảnh",icon:Images},
  {href:"/admin/site",label:"Giao diện website",icon:Palette},
  {href:"/admin/security",label:"Bảo mật tài khoản",icon:LockKeyhole}
 ]}
];
const staffNav:NavItem[]=[
 {href:"/admin/orders",label:"Xử lý đơn hàng",icon:ClipboardList},
 {href:"/admin/catalog",label:"Tra cứu sản phẩm",icon:Package},
 {href:"/admin/inventory",label:"Quản lý kho",icon:Boxes},
 {href:"/admin/security",label:"Bảo mật tài khoản",icon:LockKeyhole}
];
const staffPaths=["/admin/orders","/admin/catalog","/admin/inventory","/admin/security"];
function isCurrent(pathname:string,href:string){
 if(href==="/admin")return pathname===href;
 // The warehouse/insights view is a separate primary item, not a subpage
 // of the operational warehouse procurement menu.
 if(href==="/admin/warehouse"&&pathname.startsWith("/admin/warehouse/insights"))return false;
 return pathname===href||pathname.startsWith(href+"/");
}
function NavLink({item,pathname}:{item:NavItem;pathname:string}){
 const active=isCurrent(pathname,item.href);
 return <Link href={item.href} className={active?"admin-nav-active":"admin-nav-item"}
  aria-current={active?"page":undefined}>
  <item.icon size={18} aria-hidden="true"/><span>{item.label}</span>
 </Link>;
}
export function AdminShell({children,name,role}:{children:React.ReactNode;name:string;role:Role}){
 const pathname=usePathname();const router=useRouter();
 const allowed=role==="ADMIN"||staffPaths.some(p=>pathname===p||pathname.startsWith(p+"/"));
 useEffect(()=>{if(role==="STAFF"&&pathname==="/admin")router.replace("/admin/orders")},[role,pathname,router]);
 async function logout(){const res=await fetch("/api/store/auth/logout",{method:"POST"});if(res.ok){router.replace("/account");router.refresh()}}
 return <RoleContext.Provider value={role}><AdminToastProvider><div className="admin-frame">
  <aside className="admin-sidebar">
   <Link className="brand" href="/">enjoy<span>life</span></Link>
   <span className="eyebrow">{role==="STAFF"?"KHU VỰC NHÂN VIÊN":"TRUNG TÂM QUẢN TRỊ"}</span>
   <nav aria-label="Điều hướng quản trị" className="admin-sidebar-navigation">
    {role==="ADMIN"
     ?<><div className="admin-nav-primary">
       {primaryNav.map(item=><NavLink key={item.href} item={item} pathname={pathname}/>)}
      </div>
      <AdminFlyoutNav groups={secondaryNav} pathname={pathname}/>
</>
     :<div className="admin-nav-primary">
       {staffNav.map(item=><NavLink key={item.href} item={item} pathname={pathname}/>)}
      </div>}
   </nav>
   <div className="admin-sidebar-bottom">
    <span>{name} · {role==="STAFF"?"Nhân viên":"Quản trị viên"}</span>
    <button onClick={()=>void logout()} type="button"><LogOut size={16}/> Đăng xuất</button>
    <Link className="admin-back" href="/">VỀ CỬA HÀNG <ArrowUpRight size={16}/></Link>
   </div>
  </aside>
  <div className="admin-main"><header className="admin-topbar">
   <strong>Enjoy Life / {role==="STAFF"?"Staff":"Admin"}</strong><span>{name}</span>
  </header><main className="admin-workspace">{allowed?children:
   <section className="admin-surface" role="alert">
    <h1>Không có quyền truy cập</h1>
    <p>Tài khoản nhân viên chỉ được sử dụng các trang đã cấp quyền.</p>
    <Link className="button-dark" href="/admin/orders">VỀ ĐƠN HÀNG</Link>
   </section>}
  </main></div>
 </div></AdminToastProvider></RoleContext.Provider>;
}

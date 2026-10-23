"use client";

import {useEffect,useState,type FormEvent} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {
 ArrowRight,ChevronRight,ClipboardList,CreditCard,LockKeyhole,LogIn,
 LogOut,Package,RefreshCcw,ShieldCheck,ShoppingBag,UserRound,
 UserPlus
} from "lucide-react";
import {money} from "@/lib/format";
import {ChangePasswordForm} from "@/components/admin/change-password-form";

type User={id:string;email:string;name:string;role:"ADMIN"|"STAFF"|"CUSTOMER"};
type Order={order_no:string;status:string;payment_status:string;payment_method:string;total_vnd:number;created_at:string;tracking_token?:string};
type AuthResponse={user?:User|null;error?:string};
type AccountSection="overview"|"orders"|"security";
type OrdersFilter="all"|"active"|"finished";
const orderStatus:Record<string,string>={
 PENDING_CONFIRMATION:"Chờ xác nhận",CONFIRMED:"Đã xác nhận",PREPARING:"Đang chuẩn bị",
 SHIPPING:"Đang giao hàng",DELIVERED:"Đã giao hàng",COMPLETED:"Hoàn tất",
 CANCELLED:"Đã hủy",RETURNED:"Hàng đã hoàn về"
};
const paymentStatus:Record<string,string>={
 UNPAID:"Chưa thanh toán",PAID:"Đã thanh toán",REVIEW_REQUIRED:"Đang đối soát"
};
const paymentMethods:Record<string,string>={PAYOS:"Chuyển khoản QR",COD:"Thanh toán khi nhận hàng"};
const activeStatuses=new Set(["PENDING_CONFIRMATION","CONFIRMED","PREPARING","SHIPPING","DELIVERED"]);
const closedStatuses=new Set(["COMPLETED","CANCELLED","RETURNED"]);
function dateLabel(date:string){
 const parsed=new Date(date);
 return Number.isNaN(parsed.getTime())?"—":parsed.toLocaleDateString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric"});
}
function OrderCard({order}:{order:Order}){
 const token=order.tracking_token;
 const canTrack=typeof token==="string"&&/^[a-f0-9]{48}$/i.test(token);
 const active=activeStatuses.has(order.status);
 return <article className="account-order-card">
  <div className="account-order-top">
   <div className="account-order-reference">
    <span className="account-order-icon"><ShoppingBag size={19} aria-hidden="true"/></span>
    <div><strong>{order.order_no}</strong><span>Đặt ngày {dateLabel(order.created_at)}</span></div>
   </div>
   <span className={`account-order-state ${active?"account-order-state-active":order.status==="CANCELLED"?"account-order-state-cancelled":"account-order-state-complete"}`}>
    {orderStatus[order.status]??"Đang cập nhật"}
   </span>
  </div>
  <div className="account-order-meta">
   <div><span>Giá trị đơn</span><strong>{money(order.total_vnd)}</strong></div>
   <div><span>Thanh toán</span><strong>{paymentStatus[order.payment_status]??"Đang cập nhật"}</strong></div>
   <div><span>Phương thức</span><strong>{paymentMethods[order.payment_method]??"—"}</strong></div>
  </div>
  {canTrack&&<Link className="account-order-link" href={`/orders/${token}`}>
   Xem chi tiết và theo dõi đơn <ArrowRight size={16} aria-hidden="true"/>
  </Link>}
 </article>;
}
export default function AccountPage(){
 const router=useRouter();
 const [user,setUser]=useState<User|null|undefined>(undefined);
 const [orders,setOrders]=useState<Order[]>([]);
 const [ordersLoading,setOrdersLoading]=useState(false);
 const [ordersError,setOrdersError]=useState("");
 const [section,setSection]=useState<AccountSection>("overview");
 const [filter,setFilter]=useState<OrdersFilter>("all");
 const [mode,setMode]=useState<"login"|"register">("login");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);

 async function loadOrders(){
  setOrdersLoading(true);setOrdersError("");
  try{
   const response=await fetch("/api/store/account/orders",{cache:"no-store"});
   if(!response.ok)throw Error("Không tải được lịch sử đơn hàng.");
   const data:{items?:Order[]}=await response.json();
   setOrders(Array.isArray(data.items)?data.items:[]);
  }catch{
   setOrdersError("Chưa thể tải đơn hàng. Vui lòng thử lại.");
  }finally{setOrdersLoading(false)}
 }
 async function load(){
  try{
   const response=await fetch("/api/store/auth/me",{cache:"no-store"});
   if(!response.ok)throw Error("Không kiểm tra được phiên đăng nhập.");
   const result:AuthResponse=await response.json();
   const currentUser=result.user??null;
   setUser(currentUser);
   if(currentUser?.role==="ADMIN"||currentUser?.role==="STAFF"){
    router.replace("/admin");
    return;
   }
   if(currentUser)await loadOrders();
  }catch{
   setUser(null);setError("Không kết nối được máy chủ. Vui lòng thử lại.");
  }
 }
 useEffect(()=>{
  const timer=window.setTimeout(()=>{void load()},0);
  return()=>window.clearTimeout(timer);
  // Initial session lookup only. A successful login refreshes state separately.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy)return;
  setBusy(true);setError("");
  const form=new FormData(event.currentTarget);
  const identity=String(form.get("identity")??"").trim();
  const password=String(form.get("password")??"");
  const name=String(form.get("name")??"").trim();
  const localAdmin=mode==="login"&&identity.toLowerCase()==="admin";
  if(!localAdmin&&!identity.includes("@")){
   setError(mode==="login"?"Nhập email hợp lệ hoặc tên đăng nhập admin.":"Vui lòng nhập email hợp lệ.");
   setBusy(false);return;
  }
  const endpoint=localAdmin?"/api/store/auth/admin-demo":`/api/store/auth/${mode==="login"?"login":"register"}`;
  const body=localAdmin?{username:"admin",password}:{email:identity,password,name};
  try{
   const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
   const result:AuthResponse=await response.json();
   if(!response.ok||!result.user){
    if(localAdmin&&response.status===404)throw Error("Đăng nhập Admin thử nghiệm chưa khả dụng. Kiểm tra APP_ENV=development, GIN_MODE=debug và ENABLE_DEV_ADMIN=true trong file .env, sau đó tạo lại container API.");
    throw Error(result.error||"Đăng nhập không thành công.");
   }
   if(localAdmin&&result.user.role!=="ADMIN")throw Error("Không có quyền truy cập quản trị.");
   setUser(result.user);setOrders([]);setSection("overview");
   if(result.user.role==="ADMIN"||result.user.role==="STAFF"){
    router.replace("/admin");router.refresh();
   }else await loadOrders();
  }catch(cause){
   setError(cause instanceof Error?cause.message:"Không thể thực hiện yêu cầu.");
  }finally{setBusy(false)}
 }
 async function logout(){
  try{
   setError("");
   const response=await fetch("/api/store/auth/logout",{method:"POST"});
   if(!response.ok)throw Error("Đăng xuất thất bại.");
   setUser(null);setOrders([]);setOrdersError("");setSection("overview");
   router.refresh();
  }catch{setError("Không thể đăng xuất. Vui lòng thử lại.")}
 }

 if(user===undefined)return <div className="page-shell account-loading" role="status">
  <span className="account-loading-circle" aria-hidden="true"/><p>Đang mở tài khoản của bạn...</p>
 </div>;

 if(user){
  const openOrders=orders.filter(o=>activeStatuses.has(o.status)).length;
  const completed=orders.filter(o=>o.status==="COMPLETED").length;
  const shown=orders.filter(o=>filter==="all"||(filter==="active"?activeStatuses.has(o.status):closedStatuses.has(o.status)));
  const nav=[{key:"overview" as const,label:"Tổng quan",icon:UserRound},
   {key:"orders" as const,label:"Đơn mua của tôi",icon:Package},
   {key:"security" as const,label:"Bảo mật tài khoản",icon:LockKeyhole}];
  return <div className="page-shell account-dashboard">
   <div className="account-dashboard-intro">
    <span className="eyebrow">ENJOY LIFE / TÀI KHOẢN</span>
    <h1>Tài khoản của bạn</h1>
    <p>Quản lý đơn mua và bảo mật tài khoản tại một nơi.</p>
   </div>
   <div className="account-dashboard-layout">
    <aside className="account-dashboard-sidebar">
     <div className="account-profile-compact">
      <span className="account-avatar" aria-hidden="true">{user.name.trim().charAt(0).toLocaleUpperCase("vi-VN")||"E"}</span>
      <div><strong title={user.name}>{user.name}</strong><span title={user.email}>{user.email}</span></div>
     </div>
     <nav className="account-section-nav" aria-label="Các mục tài khoản">
      {nav.map(item=>{
       const Icon=item.icon;
       return <button key={item.key} type="button" className={`account-section-tab${section===item.key?" account-section-tab-active":""}`}
        aria-current={section===item.key?"page":undefined} onClick={()=>setSection(item.key)}>
        <Icon size={19} aria-hidden="true"/><span>{item.label}</span><ChevronRight size={16} className="account-section-chevron" aria-hidden="true"/>
       </button>;
      })}
     </nav>
     <div className="account-sidebar-actions">
      <Link href="/shop"><ShoppingBag size={17} aria-hidden="true"/> Tiếp tục mua sắm</Link>
      <button type="button" onClick={()=>void logout()}><LogOut size={17} aria-hidden="true"/> Đăng xuất</button>
     </div>
    </aside>
    <main className="account-dashboard-content" id="account-main">
     {error&&<p className="form-error" role="alert">{error}</p>}
     {section==="overview"&&<>
      <div className="account-panel-heading">
       <div><span className="eyebrow">TỔNG QUAN</span><h2>Xin chào, {user.name.split(" ").filter(Boolean).slice(-1)[0]||user.name}!</h2>
        <p>Rất vui khi bạn trở lại với Enjoy Life.</p></div>
      </div>
      <div className="account-summary-grid">
       <div className="account-summary-tile"><ShoppingBag size={20} aria-hidden="true"/><strong>{orders.length}</strong><span>Đơn gần đây</span></div>
       <div className="account-summary-tile"><Package size={20} aria-hidden="true"/><strong>{openOrders}</strong><span>Đang xử lý / giao</span></div>
       <div className="account-summary-tile"><ShieldCheck size={20} aria-hidden="true"/><strong>{completed}</strong><span>Đơn hoàn tất</span></div>
      </div>
      <div className="account-split-heading">
       <div><h3>Đơn hàng gần đây</h3><p>Theo dõi những đơn mua mới nhất của bạn.</p></div>
       <button type="button" className="account-link-action" onClick={()=>setSection("orders")}>Tất cả đơn hàng <ArrowRight size={16} aria-hidden="true"/></button>
      </div>
      {ordersLoading?<p className="account-inline-message" role="status">Đang tải đơn hàng...</p>:
       ordersError?<div className="account-inline-message" role="alert">{ordersError} <button type="button" onClick={()=>void loadOrders()}>Thử lại</button></div>:
       orders.length?<div className="account-order-list">{orders.slice(0,3).map(order=><OrderCard key={order.order_no} order={order}/>)}</div>:
       <div className="account-empty-state"><ShoppingBag size={27} aria-hidden="true"/><h3>Chưa có đơn hàng nào</h3>
        <p>Khám phá các thiết kế mới và bắt đầu đơn hàng đầu tiên của bạn.</p>
        <Link className="account-primary-link" href="/shop">Khám phá sản phẩm <ArrowRight size={16}/></Link>
       </div>}
     </>}
     {section==="orders"&&<>
      <div className="account-panel-heading"><div><span className="eyebrow">ĐƠN MUA</span><h2>Đơn hàng của tôi</h2>
       <p>Xem tình trạng giao hàng, thanh toán và chi tiết từng đơn.</p></div>
       <button className="account-refresh-button" type="button" onClick={()=>void loadOrders()} disabled={ordersLoading}><RefreshCcw size={16}/> Làm mới</button>
      </div>
      <div className="account-order-filters" aria-label="Lọc đơn hàng">
       {([{key:"all",label:"Tất cả"},{key:"active",label:"Đang xử lý"},{key:"finished",label:"Đã kết thúc"}] as const).map(x=>
        <button key={x.key} type="button" className={filter===x.key?"selected":""} aria-pressed={filter===x.key}
         onClick={()=>setFilter(x.key)}>{x.label}</button>)}
      </div>
      {ordersLoading?<p className="account-inline-message" role="status">Đang tải đơn hàng...</p>:
       ordersError?<div className="account-inline-message" role="alert">{ordersError} <button type="button" onClick={()=>void loadOrders()}>Thử lại</button></div>:
       shown.length?<div className="account-order-list">{shown.map(o=><OrderCard key={o.order_no} order={o}/>)}</div>:
       <div className="account-empty-state"><Package size={27} aria-hidden="true"/><h3>Chưa có đơn hàng trong nhóm này</h3>
        <p>Hãy chọn một trạng thái khác để xem đơn hàng của bạn.</p>
        <button className="account-primary-link" type="button" onClick={()=>setFilter("all")}>Xem tất cả đơn hàng <ArrowRight size={16}/></button>
       </div>}
     </>}
     {section==="security"&&<>
      <div className="account-panel-heading"><div><span className="eyebrow">BẢO MẬT</span><h2>Đổi mật khẩu</h2>
       <p>Bảo vệ tài khoản bằng mật khẩu riêng và khó đoán.</p></div></div>
      <div className="account-security-card">
       <div className="account-security-lead"><LockKeyhole size={21} aria-hidden="true"/><div>
        <h3>Cập nhật mật khẩu đăng nhập</h3>
        <p>Nhập mật khẩu hiện tại và đặt mật khẩu mới dài 12–72 ký tự.</p>
       </div></div>
       <ChangePasswordForm/>
       <p className="account-security-tip"><ShieldCheck size={16} aria-hidden="true"/> Sau khi đổi mật khẩu, các phiên đăng nhập khác sẽ hết hiệu lực.</p>
      </div>
     </>}
    </main>
   </div>
  </div>;
 }

 return <div className="page-shell account-access-page">
  <div className="account-access-copy"><span className="eyebrow">ENJOY LIFE / THÀNH VIÊN</span>
   <h1>{mode==="login"?<>Chào mừng<br/><em>trở lại.</em></>:<>Bắt đầu cùng<br/><em>Enjoy Life.</em></>}</h1>
   <p>{mode==="login"?"Đăng nhập để theo dõi đơn hàng, quản lý tài khoản và tiếp tục hành trình mua sắm.":"Tạo tài khoản để lưu và theo dõi các đơn hàng dễ dàng hơn."}</p>
   <Link href="/shop">Khám phá cửa hàng <ArrowRight size={17} aria-hidden="true"/></Link>
  </div>
  <div className="account-access-card">
   <div className="account-access-head"><span className="eyebrow">TÀI KHOẢN CỦA BẠN</span>
    <h2>{mode==="login"?"Đăng nhập":"Đăng ký tài khoản"}</h2></div>
   <div className="account-access-tabs">
    <button type="button" className={mode==="login"?"active":""} onClick={()=>{setMode("login");setError("")}}><LogIn size={17}/> Đăng nhập</button>
    <button type="button" className={mode==="register"?"active":""} onClick={()=>{setMode("register");setError("")}}><UserPlus size={17}/> Đăng ký</button>
   </div>
   <form onSubmit={e=>void submit(e)}>
    {mode==="register"&&<label>Họ và tên<input name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="Tên của bạn"/></label>}
    <label>{mode==="login"?"Email hoặc tên đăng nhập":"Địa chỉ email"}
     <input key={mode} name="identity" type={mode==="register"?"email":"text"} required
      autoComplete={mode==="login"?"username":"email"} placeholder={mode==="login"?"Email của bạn":"email@example.com"}/>
    </label>
    <label>Mật khẩu
     <input name="password" type="password" required minLength={mode==="register"?8:1}
      autoComplete={mode==="login"?"current-password":"new-password"} placeholder="Nhập mật khẩu"/>
    </label>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <button className="button-dark full-width" type="submit" disabled={busy}>{busy?"ĐANG XỬ LÝ...":mode==="login"?"ĐĂNG NHẬP":"TẠO TÀI KHOẢN"} <ArrowRight size={17}/></button>
   </form>
   <p className="account-access-foot"><CreditCard size={16} aria-hidden="true"/> Theo dõi đơn mua và thanh toán ngay trong tài khoản.</p>
  </div>
 </div>;
}

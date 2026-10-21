"use client";
import Link from "next/link";
import {ArrowUpRight,ShoppingBag,Boxes,Package,ClipboardList} from "lucide-react";
import {moneyVND,useAdminData} from "@/components/admin/admin-data";
type Summary={orders:number;pending_orders:number;order_value_vnd:number;low_stock_skus:number;products:number;revenue_note:string};
type Order={order_no:string;customer_name:string;status:string;total_vnd:number;created_at:string};
const statusLabel:Record<string,string>={PENDING_CONFIRMATION:"Chờ xác nhận",CONFIRMED:"Đã xác nhận",PREPARING:"Đang chuẩn bị",SHIPPING:"Đang giao",DELIVERED:"Đã giao",COMPLETED:"Hoàn tất",CANCELLED:"Đã hủy"};
export default function AdminDashboard(){
 const summary=useAdminData<Summary>("admin/dashboard");
 const orders=useAdminData<{items:Order[]}>("admin/orders");
 const stats=[{label:"Đơn cần xác nhận",value:summary.data?.pending_orders,icon:ClipboardList,href:"/admin/orders"},{label:"Giá trị đơn chưa hủy",value:summary.data?moneyVND(summary.data.order_value_vnd):undefined,icon:ShoppingBag,href:"/admin/reports"},{label:"SKU thiếu hàng (≤ 3)",value:summary.data?.low_stock_skus,icon:Boxes,href:"/admin/inventory"},{label:"Số sản phẩm",value:summary.data?.products,icon:Package,href:"/admin/products"}];
 return <><div className="admin-title-line"><div><span className="eyebrow">TỔNG QUAN / DỮ LIỆU THỰC TẾ</span><h1>Hoạt động cửa hàng</h1><p>Điều hành đơn hàng, tồn kho và danh mục sản phẩm tại một nơi.</p></div></div>
  {(summary.error||orders.error)&&<div role="alert" className="admin-error">{summary.error||orders.error}</div>}
  <div className="admin-metrics">{stats.map(s=><Link href={s.href} key={s.label} className="admin-stat"><s.icon size={22}/><span>{s.label}</span><strong>{summary.loading?"…":s.value??"—"}</strong><small>Xem chi tiết <ArrowUpRight size={13}/></small></Link>)}</div>
  <div className="admin-info-strip">Giá trị đơn đã tạo không đồng nghĩa doanh thu đã thu. Để xem tiền COD đã xác nhận thu, vào Báo cáo.</div>
  <section className="admin-surface"><div className="admin-section-top"><div><h2>Đơn hàng gần đây</h2><p>Theo dõi đơn mới và các bước cần xử lý</p></div><Link href="/admin/orders" className="admin-link">Xem tất cả <ArrowUpRight size={16}/></Link></div>
  {orders.loading?<p>Đang tải đơn hàng...</p>:!orders.data?.items?.length?<p className="admin-empty">Chưa có đơn hàng.</p>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Trạng thái</th><th>Giá trị</th></tr></thead><tbody>{orders.data.items.slice(0,8).map(o=><tr key={o.order_no}><td>{o.order_no}</td><td>{o.customer_name}</td><td><span className="admin-pill">{statusLabel[o.status]??o.status}</span></td><td>{moneyVND(o.total_vnd)}</td></tr>)}</tbody></table></div>}</section>
 </>;
}

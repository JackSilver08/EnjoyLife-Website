import Link from "next/link";
import { Check, ArrowUpRight } from "lucide-react";
import { money } from "@/lib/format";
export const metadata = {title:"Tra cứu đơn hàng",robots:{index:false,follow:false}};
const orderStatus: Record<string, string> = { PENDING_CONFIRMATION: "Chờ xác nhận" };
const paymentMethod: Record<string, string> = { COD: "Thanh toán khi nhận hàng" };
const paymentStatus: Record<string, string> = { UNPAID: "Chưa thanh toán" };
export default async function OrderPage({params}: {params: Promise<{token:string}>}) {
  const {token}=await params;
  let order: {order_no:string;status:string;payment_status:string;payment_method:string;total_vnd:number}|null=null;
  try {
    const res=await fetch(`${process.env.API_INTERNAL_URL??"http://localhost:8081"}/api/v1/orders/${encodeURIComponent(token)}`,{cache:"no-store"});
    if(res.ok) order=await res.json();
  } catch { /* Render a useful offline message. */ }
  if(!order) return <div className="page-shell status-page"><h1>Chưa thể tra cứu đơn.</h1><p>API đang tạm thời không sẵn sàng hoặc liên kết đã sai.</p><Link href="/shop">Xem sản phẩm ↗</Link></div>;
  return <div className="page-shell status-page"><div className="status-check"><Check size={30}/></div><span className="eyebrow">CẢM ƠN BẠN / ENJOY LIFE</span><h1>Đã nhận<br/><em>đơn hàng.</em></h1><p>Đơn hàng đã được tạo, nhân viên sẽ liên hệ xác nhận trước khi giao.</p><div className="status-table"><div><span>Mã đơn</span><strong>{order.order_no}</strong></div><div><span>Trạng thái</span><strong>{orderStatus[order.status] ?? order.status}</strong></div><div><span>Thanh toán</span><strong>{paymentMethod[order.payment_method] ?? order.payment_method} / {paymentStatus[order.payment_status] ?? order.payment_status}</strong></div><div><span>Tổng tiền hàng</span><strong>{money(order.total_vnd)}</strong></div></div><p className="status-note">Hãy giữ kín đường dẫn này vì nó dùng để tra cứu trạng thái đơn hàng. Đơn COD chưa được thanh toán.</p><Link className="button-dark" href="/shop">TIẾP TỤC KHÁM PHÁ <ArrowUpRight size={16}/></Link></div>;
}

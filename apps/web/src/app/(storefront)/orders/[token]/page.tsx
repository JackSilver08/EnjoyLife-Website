import Link from "next/link";
import {Check,ArrowUpRight} from "lucide-react";
import {money} from "@/lib/format";
import {PayOSPaymentPanel} from "@/components/payos-payment-panel";
export const metadata={title:"Tra cứu đơn hàng",robots:{index:false,follow:false}};
const orderStatus:Record<string,string>={PENDING_CONFIRMATION:"Chờ xác nhận",CONFIRMED:"Đã xác nhận",PREPARING:"Đang chuẩn bị",SHIPPING:"Đang giao",DELIVERED:"Đã giao",COMPLETED:"Hoàn tất",CANCELLED:"Đã hủy",RETURNED:"Hàng đã hoàn về"};
const paymentMethod:Record<string,string>={COD:"Thanh toán khi nhận hàng",PAYOS:"Mã QR payOS"};
const paymentStatus:Record<string,string>={UNPAID:"Chưa thanh toán",PAID:"Đã thanh toán",REVIEW_REQUIRED:"Cần đối soát giao dịch"};
type Order={order_no:string;status:string;payment_status:string;payment_method:string;total_vnd:number;checkout_url?:string;qr_code?:string;gateway_status?:string};
export default async function OrderPage({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 let order:Order|null=null;
 try{
  const res=await fetch(`${process.env.API_INTERNAL_URL??"http://localhost:8081"}/api/v1/orders/${encodeURIComponent(token)}`,{cache:"no-store"});
  if(res.ok)order=await res.json() as Order;
 }catch{}
 if(!order)return <div className="page-shell status-page"><h1>Chưa thể tra cứu đơn.</h1><p>Liên kết đã sai hoặc API tạm thời chưa sẵn sàng.</p><Link href="/shop">Xem sản phẩm ↗</Link></div>;
 const isPayOS=order.payment_method==="PAYOS";
 const paid=order.payment_status==="PAID";
 return <div className="page-shell status-page">
  <div className="status-check"><Check size={30}/></div>
  <span className="eyebrow">ĐƠN HÀNG / ENJOY LIFE</span>
  <h1>Đã nhận<br/><em>đơn hàng.</em></h1>
  <p>{order.status==="CANCELLED"?"Đơn hàng đã được hủy.":order.status==="RETURNED"?"Đơn giao không thành công. Hàng đã được cửa hàng nhận về và đang được kiểm tra.":isPayOS&&!paid?"Đơn hàng đã được tạo, nhưng giao dịch QR chưa được xác nhận.":"Cửa hàng đã nhận đơn và sẽ liên hệ khi cần."}</p>
  <div className="status-table">
   <div><span>Mã đơn</span><strong>{order.order_no}</strong></div>
   <div><span>Trạng thái</span><strong>{orderStatus[order.status]??order.status}</strong></div>
   <div><span>Phương thức</span><strong>{paymentMethod[order.payment_method]??order.payment_method}</strong></div>
   <div><span>Thanh toán</span><strong>{paymentStatus[order.payment_status]??order.payment_status}</strong></div>
   <div><span>Tổng tiền hàng</span><strong>{money(order.total_vnd)}</strong></div>
  </div>
  {isPayOS&&order.status!=="CANCELLED"&&<PayOSPaymentPanel token={token} initialPaymentStatus={order.payment_status} initialCheckoutURL={order.checkout_url??""} initialQR={order.qr_code??""} amountVND={order.total_vnd} initialGatewayStatus={order.gateway_status??""}/>}
  <p className="status-note">Hãy giữ kín đường dẫn này vì nó dùng để tra cứu trạng thái đơn. Việc quay lại website không tự xác nhận đã nhận tiền.</p>
  <Link className="button-dark" href="/shop">TIẾP TỤC KHÁM PHÁ <ArrowUpRight size={16}/></Link>
 </div>
}

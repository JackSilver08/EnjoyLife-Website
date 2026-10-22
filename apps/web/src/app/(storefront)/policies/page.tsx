import Link from "next/link";
export const metadata={title:"Giao hàng và đổi trả"};
export default function Policies(){
 return <section className="page-shell policies-page"><span className="eyebrow">ENJOY LIFE / HỖ TRỢ MUA HÀNG</span><h1>Thông tin <em>mua sắm.</em></h1><div className="policy-list">
  <article><h2>Thanh toán</h2><p>Đơn COD được thanh toán khi nhận hàng. Thanh toán QR payOS chỉ có khi kênh được bật tại trang đặt hàng. Không chuyển khoản qua tin nhắn hoặc đường dẫn chưa được xác minh.</p></article>
  <article><h2>Giao hàng</h2><p>Phí và thời gian giao hàng được cửa hàng xác nhận khi xử lý đơn. Chưa có phí vận chuyển cố định trên website.</p></article>
  <article><h2>Đổi trả</h2><p>Chính sách đổi trả chính thức đang được hoàn thiện. Vui lòng liên hệ cửa hàng để xác nhận điều kiện áp dụng trước khi đặt hàng.</p></article>
 </div><Link className="text-link" href="/shop">TIẾP TỤC MUA SẮM ↗</Link></section>;
}

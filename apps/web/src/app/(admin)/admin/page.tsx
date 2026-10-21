import Link from "next/link";
import { Package, Boxes, ClipboardList, BarChart3, ShieldAlert, Sparkles, LayoutDashboard, ArrowUpRight } from "lucide-react";
const sections=[{icon:ClipboardList,title:"Đơn hàng",detail:"Chờ xây dựng quy trình xác nhận và xử lý"},{icon:Package,title:"Sản phẩm",detail:"Sẽ kết nối CRUD sau khi có phân quyền"},{icon:Boxes,title:"Kho hàng",detail:"Cần kiểm soát xuất, nhập và đối soát"},{icon:BarChart3,title:"Báo cáo",detail:"Phân biệt tổng giá trị đơn và doanh thu thực"}];
export default function AdminPage(){
  return <div className="admin-frame">
    <aside className="admin-sidebar"><Link className="brand" href="/">enjoy<span>life</span></Link><span className="eyebrow">QUẢN TRỊ / BẢN DEMO</span><nav aria-label="Phân hệ quản trị"><div className="admin-nav-active"><LayoutDashboard size={18}/> Tổng quan</div>{sections.map(s=><div key={s.title} className="admin-nav-disabled"><s.icon size={18}/>{s.title}<span>·</span></div>)}</nav><Link href="/" className="admin-back">VỀ TRANG CHỦ <ArrowUpRight size={16}/></Link></aside>
    <main className="admin-workspace"><div className="admin-top"><span className="eyebrow">ENJOY LIFE / OPERATIONS</span><span className="admin-demo-label">DEMO KHÔNG DÙNG DỮ LIỆU THẬT</span></div>
      <h1>Tổng quan cửa hàng</h1><p className="admin-subtitle">Không gian làm việc cho vận hành bán hàng, kho và trợ lý AI.</p>
      <div className="admin-banner"><ShieldAlert size={20}/><p>Giao diện thử nghiệm, chưa có đăng nhập/RBAC nghiệp vụ. Chỉ truy cập từ môi trường phát triển đã đặt mật khẩu demo. Không dùng để xử lý đơn thật.</p></div>
      <div className="admin-kpi-v2">{["Đơn chờ xác nhận","Tổng giá trị đơn","SKU sắp hết","Yêu cầu đổi trả"].map(x=><div key={x} className="admin-metric"><span>{x}</span><strong>—</strong><small>Chưa kết nối báo cáo đã xác thực</small></div>)}</div>
      <div className="admin-panel-grid"><section><h2>Công việc cần xử lý</h2><p>Danh sách đơn hàng, yêu cầu đổi trả và cảnh báo kho sẽ xuất hiện khi API quản trị và RBAC hoàn thành.</p><div className="admin-empty">Chưa có nguồn dữ liệu quản trị được cấp quyền.</div></section><section className="admin-ai-panel"><Sparkles size={27}/><h2>AI Business Assistant</h2><p>Trợ lý chỉ được đọc các báo cáo được phép. Chưa kích hoạt model hoặc quyền chỉnh sửa dữ liệu.</p><span>CHƯA KẾT NỐI</span></section></div>
    </main></div>;
}

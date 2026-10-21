"use client";
import {moneyVND,useAdminData} from "@/components/admin/admin-data";
type Report={recorded_payment_vnd:number;orders_last_30_days:number;unpaid_orders:number;daily:{day:string;orders:number;order_value_vnd:number}[];note:string};
export default function Reports(){
 const {data,loading,error,reload}=useAdminData<Report>("admin/reports");
 const max=Math.max(1,...(data?.daily??[]).map(x=>x.order_value_vnd));
 return <><span className="eyebrow">PHÂN TÍCH / BÁO CÁO</span><h1>Kết quả kinh doanh</h1><p className="admin-subtitle">Phân biệt giá trị đơn đã tạo và số tiền được đánh dấu đã thu.</p>
 <div className="admin-toolbar"><button onClick={()=>void reload()}>Làm mới</button></div>
 {error&&<p role="alert" className="admin-error">{error}</p>}
 <div className="admin-metrics">
  <div className="admin-stat"><span>Số tiền đơn đã đánh dấu PAID</span><strong>{loading?"…":moneyVND(data?.recorded_payment_vnd??0)}</strong><small>Chưa thay thế đối soát thực tế</small></div>
  <div className="admin-stat"><span>Số đơn 30 ngày</span><strong>{loading?"…":data?.orders_last_30_days??0}</strong></div>
  <div className="admin-stat"><span>Đơn chưa xác nhận đã thu tiền</span><strong>{loading?"…":data?.unpaid_orders??0}</strong></div>
 </div>
 <section className="admin-surface"><h2>Giá trị đơn trong 7 ngày</h2><p className="admin-subtitle">Chưa trừ hoàn tiền, phí vận chuyển hoặc các khoản chi phí.</p>
 {!data?.daily?.length?<p className="admin-empty">Chưa có đơn trong khoảng thời gian này.</p>:<div className="admin-bars">{data.daily.map(x=><div key={x.day} className="admin-bar-line"><span>{new Date(x.day+"T00:00:00").toLocaleDateString("vi-VN")}</span><div className="admin-bar-track"><div style={{width:(x.order_value_vnd/max*100)+"%"}}/></div><strong>{moneyVND(x.order_value_vnd)}</strong></div>)}</div>}</section>
 <p className="admin-help">{data?.note??"Dữ liệu bán hàng chỉ được tổng hợp từ hệ thống Enjoy Life."}</p>
 </>;
}

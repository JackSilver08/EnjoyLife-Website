"use client";
import {useAdminData} from "@/components/admin/admin-data";
type User={id:string;email:string;name:string;role:string;created_at:string};
export default function Customers(){
 const {data,loading,error,reload}=useAdminData<{items:User[]}>("admin/users");
 const users=(data?.items??[]).filter(x=>x.role==="CUSTOMER");
 return <><span className="eyebrow">QUẢN LÝ / KHÁCH HÀNG</span><h1>Khách hàng</h1><p className="admin-subtitle">Danh sách khách đã đăng ký tài khoản. Khách đặt hàng không đăng nhập vẫn có trong đơn hàng.</p>
 <div className="admin-toolbar"><button onClick={()=>void reload()}>Làm mới</button></div>{error&&<p className="admin-error" role="alert">{error}</p>}
 <section className="admin-surface">{loading?<p>Đang tải...</p>:!users.length?<p className="admin-empty">Chưa có khách đăng ký.</p>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Họ tên</th><th>Email</th><th>Ngày đăng ký</th></tr></thead><tbody>{users.map(x=><tr key={x.id}><td>{x.name}</td><td>{x.email}</td><td>{new Date(x.created_at).toLocaleDateString("vi-VN")}</td></tr>)}</tbody></table></div>}</section></>;
}

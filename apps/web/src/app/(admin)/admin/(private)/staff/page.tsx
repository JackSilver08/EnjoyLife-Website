"use client";
import {useState,type FormEvent} from "react";
import {AdminModal} from "@/components/admin/admin-modal";
import {AdminFeedback} from "@/components/admin/admin-toast";
import {useAppDialog} from "@/components/app-dialog";
import {adminAction,useAdminData} from "@/components/admin/admin-data";
type Staff={id:string;email:string;name:string;disabled:boolean;created_at:string};
export default function StaffPage(){
 const {confirm}=useAppDialog();
 const {data,error,loading,reload}=useAdminData<{items:Staff[]}>("admin/staff");
 const [name,setName]=useState("");const[email,setEmail]=useState("");const[password,setPassword]=useState("");
 const [creating,setCreating]=useState(false);
 const [resetId,setResetId]=useState("");const[resetPassword,setResetPassword]=useState("");
 const [busy,setBusy]=useState("");const[notice,setNotice]=useState("");const[failed,setFailed]=useState("");
 async function create(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy("create");setFailed("");setNotice("");
  try{await adminAction("admin/staff","POST",{name,email,password});setCreating(false);setNotice("Đã tạo tài khoản nhân viên. Hãy cấp mật khẩu qua kênh riêng an toàn.");setName("");setEmail("");setPassword("");await reload()}
  catch(err){setFailed(err instanceof Error?err.message:"Không tạo được tài khoản.")}
  finally{setBusy("")}
 }
 async function toggle(s:Staff){
   if(!await confirm({title:s.disabled?"Mở khóa tài khoản?":"Khóa tài khoản?",message:(s.disabled?"Mở khóa":"Khóa")+" tài khoản "+s.email+"?"+(s.disabled?"":" Các phiên đăng nhập sẽ bị thu hồi."),confirmLabel:s.disabled?"Mở khóa":"Khóa tài khoản",cancelLabel:"Hủy",danger:!s.disabled}))return;
  setBusy(s.id);setFailed("");setNotice("");
  try{await adminAction("admin/staff/"+s.id,"PATCH",{disabled:!s.disabled});setNotice("Đã "+(s.disabled?"mở khóa":"khóa")+" "+s.email);await reload()}
  catch(err){setFailed(err instanceof Error?err.message:"Không thể cập nhật tài khoản.")}
  finally{setBusy("")}
 }
 async function reset(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(resetId);setFailed("");setNotice("");
  try{await adminAction("admin/staff/"+resetId+"/reset-password","POST",{password:resetPassword});setResetId("");setResetPassword("");setNotice("Đã đặt mật khẩu mới và thu hồi toàn bộ phiên đăng nhập cũ.")}
  catch(err){setFailed(err instanceof Error?err.message:"Không thể đặt lại mật khẩu.")}
  finally{setBusy("")}
 }
 return <><span className="eyebrow">QUẢN TRỊ / NHÂN SỰ</span><h1>Nhân viên & phân quyền</h1>
 <p className="admin-subtitle">Nhân viên được xử lý đơn và nhập, xuất, kiểm kê kho. Chỉ Admin được sửa sản phẩm, quản lý tài khoản và xác nhận thu COD.</p>
 <AdminFeedback message={notice} error={error||failed}/>
 <div className="admin-toolbar"><button type="button" className="button-dark" onClick={()=>setCreating(true)}>+ Thêm nhân viên</button></div>
 {creating&&<AdminModal title="Tạo tài khoản nhân viên" subtitle="Cấp quyền nhân viên vận hành đơn hàng và kho." onClose={()=>!busy&&setCreating(false)} busy={!!busy}><section className="admin-surface sprint7-panel"><h2>Tạo tài khoản nhân viên</h2>
 <form onSubmit={e=>void create(e)} className="sprint7-form">
 <label>Họ và tên<input required minLength={2} maxLength={100} autoComplete="off" value={name} onChange={e=>setName(e.target.value)}/></label>
 <label>Email đăng nhập<input required type="email" autoComplete="off" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label>
 <label>Mật khẩu ban đầu<input required type="password" autoComplete="new-password" minLength={12} maxLength={72} value={password} onChange={e=>setPassword(e.target.value)}/></label>
 <button className="button-dark" type="submit" disabled={!!busy}>{busy==="create"?"ĐANG TẠO...":"TẠO NHÂN VIÊN"}</button>
 </form><p className="admin-help">Mật khẩu phải dài 12–72 ký tự. Không gửi mật khẩu qua email hoặc hội thoại không bảo mật.</p>
 </section></AdminModal>}
 <section className="admin-surface sprint7-panel"><div className="admin-section-top"><h2>Danh sách nhân viên</h2><button type="button" onClick={()=>void reload()}>Làm mới</button></div>
 {loading?<p>Đang tải...</p>:!data?.items.length?<p className="admin-empty">Chưa có nhân viên.</p>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Nhân viên</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead><tbody>
 {data.items.map(s=><tr key={s.id}><td><strong>{s.name}</strong><small>{s.email}</small></td><td>STAFF</td><td><span className="admin-pill">{s.disabled?"Đã khóa":"Đang hoạt động"}</span></td><td>{new Date(s.created_at).toLocaleDateString("vi-VN")}</td>
 <td><div className="admin-row-actions"><button type="button" disabled={!!busy} onClick={()=>void toggle(s)} className={!s.disabled?"admin-danger":""}>{s.disabled?"Mở khóa":"Khóa"}</button><button type="button" disabled={!!busy} onClick={()=>{setResetId(resetId===s.id?"":s.id);setResetPassword("");setFailed("")}}>Đặt lại mật khẩu</button></div></td></tr>)}</tbody></table></div>}
 {resetId&&<AdminModal title="Đặt lại mật khẩu nhân viên" subtitle="Mật khẩu mới sẽ thay thế thông tin đăng nhập cũ." onClose={()=>!busy&&setResetId("")} busy={!!busy}><form className="sprint7-reset" onSubmit={e=>void reset(e)}><h3>Đặt lại mật khẩu nhân viên</h3><p>{data?.items.find(s=>s.id===resetId)?.email}</p><label>Mật khẩu mới<input type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={resetPassword} onChange={e=>setResetPassword(e.target.value)}/></label><div className="admin-row-actions"><button className="button-dark" disabled={!!busy} type="submit">LƯU MẬT KHẨU</button><button type="button" onClick={()=>setResetId("")}>Hủy</button></div></form></AdminModal>}
 </section></>;
}

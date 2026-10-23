"use client";
import {useState,type FormEvent} from "react";
import {AdminFeedback} from "@/components/admin/admin-toast";
export function ChangePasswordForm(){
 const[oldPassword,setOldPassword]=useState("");const[newPassword,setNewPassword]=useState("");const[confirm,setConfirm]=useState("");const[busy,setBusy]=useState(false);const[notice,setNotice]=useState("");const[error,setError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){
 e.preventDefault();setError("");setNotice("");
 if(newPassword!==confirm){setError("Mật khẩu xác nhận không khớp.");return}
 if(newPassword===oldPassword){setError("Mật khẩu mới phải khác mật khẩu cũ.");return}
 setBusy(true);
 try{const response=await fetch("/api/store/auth/change-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({current_password:oldPassword,new_password:newPassword})});
 const data=await response.json();if(!response.ok)throw Error(data.error||"Không đổi được mật khẩu.");
 setOldPassword("");setNewPassword("");setConfirm("");setNotice("Đã đổi mật khẩu. Các phiên đăng nhập khác đã bị đăng xuất.");
 }catch(err){setError(err instanceof Error?err.message:"Đổi mật khẩu thất bại.")}finally{setBusy(false)}
 }
 return <form className="sprint7-form sprint7-password-form" onSubmit={e=>void submit(e)}>
 <label>Mật khẩu hiện tại<input required autoComplete="current-password" type="password" value={oldPassword} onChange={e=>setOldPassword(e.target.value)}/></label>
 <label>Mật khẩu mới (12–72 ký tự)<input required minLength={12} maxLength={72} autoComplete="new-password" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label>
 <label>Nhập lại mật khẩu mới<input required minLength={12} maxLength={72} autoComplete="new-password" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
 <button className="button-dark" type="submit" disabled={busy}>{busy?"ĐANG CẬP NHẬT...":"ĐỔI MẬT KHẨU"}</button>
 <AdminFeedback message={notice} error={error}/>
 </form>;
}

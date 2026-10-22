import {ChangePasswordForm} from "@/components/admin/change-password-form";
export default function SecurityPage(){
 return <><span className="eyebrow">TÀI KHOẢN / BẢO MẬT</span><h1>Đổi mật khẩu</h1><p className="admin-subtitle">Đổi mật khẩu cá nhân. Sau khi cập nhật, các thiết bị đăng nhập khác sẽ tự động bị đăng xuất.</p><section className="admin-surface sprint7-panel"><h2>Bảo mật đăng nhập</h2><ChangePasswordForm/></section></>;
}

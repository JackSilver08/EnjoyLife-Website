"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus, LogOut, ShieldCheck } from "lucide-react";
import { money } from "@/lib/format";

type User = { id: string; email: string; name: string; role: "ADMIN" | "CUSTOMER" };
type Order = { order_no: string; status: string; payment_status: string; total_vnd: number; created_at: string };
type AuthResponse = { user?: User | null; error?: string };

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [orders, setOrders] = useState<Order[]>([]);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const response = await fetch("/api/store/auth/me", { cache: "no-store" });
      if (!response.ok) throw new Error("Không kiểm tra được phiên đăng nhập.");
      const result: AuthResponse = await response.json();
      const currentUser = result.user ?? null;
      setUser(currentUser);
      if (currentUser?.role === "ADMIN") {
        router.replace("/admin");
        return;
      }
      if (currentUser) {
        const orderResponse = await fetch("/api/store/account/orders", { cache: "no-store" });
        if (orderResponse.ok) {
          const orderData: {items?: Order[]} = await orderResponse.json();
          setOrders(orderData.items ?? []);
        }
      }
    } catch {
      setUser(null);
      setError("Không kết nối được máy chủ. Vui lòng thử lại.");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
    // Initial session lookup only. A successful login refreshes state separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const identity = String(form.get("identity") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();
    const localAdmin = mode === "login" && identity.toLowerCase() === "admin";

    if (!localAdmin && !identity.includes("@")) {
      setError(mode === "login" ? "Nhập email hợp lệ hoặc tên đăng nhập admin." : "Vui lòng nhập email hợp lệ.");
      setBusy(false);
      return;
    }

    // One login screen for everyone. The browser ONLY chooses the endpoint:
    // server-side Go verifies the dev-only admin credentials and creates the session.
    const endpoint = localAdmin
      ? "/api/store/auth/admin-demo"
      : `/api/store/auth/${mode === "login" ? "login" : "register"}`;
    const body = localAdmin
      ? { username: "admin", password }
      : { email: identity, password, name };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result: AuthResponse = await response.json();
      if (!response.ok || !result.user) {
        throw new Error(result.error || "Đăng nhập không thành công.");
      }
      if (localAdmin && result.user.role !== "ADMIN") {
        throw new Error("Không có quyền truy cập quản trị.");
      }

      setUser(result.user);
      setOrders([]);
      if (result.user.role === "ADMIN") {
        router.replace("/admin");
        router.refresh();
      } else {
        await load();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể thực hiện yêu cầu.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      const response = await fetch("/api/store/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Đăng xuất thất bại.");
      setUser(null);
      setOrders([]);
      router.refresh();
    } catch {
      setError("Không thể đăng xuất. Vui lòng thử lại.");
    }
  }

  if (user === undefined) return <div className="page-shell account-page">Đang kiểm tra tài khoản...</div>;

  if (user) return <div className="page-shell account-page">
    <span className="eyebrow">TÀI KHOẢN / ENJOY LIFE</span>
    <div className="account-head">
      <div><h1>Xin chào,<br/><em>{user.name}.</em></h1><p>{user.email}</p></div>
      <button className="text-button" onClick={() => void logout()}><LogOut size={16}/> Đăng xuất</button>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {user.role === "ADMIN" && <Link className="button-dark" href="/admin"><ShieldCheck size={17}/> ĐẾN TRANG QUẢN TRỊ</Link>}
    <h2>Đơn hàng của tôi</h2>
    {orders.length
      ? <div className="account-orders">{orders.map(o => <article key={o.order_no}>
          <strong>{o.order_no}</strong>
          <span>{o.status} · {o.payment_status}</span>
          <b>{money(o.total_vnd)}</b>
        </article>)}</div>
      : <div className="empty-state">Bạn chưa có đơn hàng nào. <Link href="/shop">Khám phá sản phẩm ↗</Link></div>}
  </div>;

  return <div className="page-shell account-page">
    <span className="eyebrow">TÀI KHOẢN / ENJOY LIFE</span>
    <h1>{mode === "login" ? <>Chào mừng<br/><em>trở lại.</em></> : <>Tạo tài khoản<br/><em>của bạn.</em></>}</h1>
    <div className="account-card">
      <div className="account-tabs">
        <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}><LogIn size={16}/> Đăng nhập</button>
        <button type="button" className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}><UserPlus size={16}/> Đăng ký</button>
      </div>
      <form onSubmit={(e) => { void submit(e); }}>
        {mode === "register" && <label>Họ và tên<input name="name" required minLength={2} maxLength={100} autoComplete="name" /></label>}
        <label>
          {mode === "login" ? "Email hoặc tên đăng nhập" : "Email"}
          <input
            key={mode}
            name="identity"
            type={mode === "register" ? "email" : "text"}
            required
            autoComplete={mode === "login" ? "username" : "email"}
            placeholder={mode === "login" ? "Email hoặc admin" : "email@example.com"}
          />
        </label>
        <label>Mật khẩu
          <input name="password" type="password" required minLength={mode === "register" ? 8 : 1}
            autoComplete={mode === "login" ? "current-password" : "new-password"}/>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button-dark full-width" disabled={busy} type="submit">
          {busy ? "ĐANG XỬ LÝ..." : mode === "login" ? "ĐĂNG NHẬP" : "TẠO TÀI KHOẢN"}
        </button>
      </form>
    </div>
  </div>;
}

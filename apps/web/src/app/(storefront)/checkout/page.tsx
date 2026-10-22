"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, LockKeyhole } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { money } from "@/lib/format";
import type { OrderResponse } from "@/lib/types";
export default function CheckoutPage() {
  const {items,total,clear} = useCart();
  const router = useRouter();
  const idempotencyKey = useRef<string | null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [method,setMethod] = useState("COD");
  const [payosEnabled,setPayosEnabled]=useState(false);
  useEffect(()=>{let live=true;fetch("/api/store/payments/config",{cache:"no-store"}).then(r=>r.json()).then(d=>{if(live)setPayosEnabled(d.payos_enabled===true)}).catch(()=>{});return()=>{live=false}},[]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(!items.length || busy) return;
    setBusy(true); setError("");
    if(!idempotencyKey.current){
      // Keep the same order key after a failed network response or page refresh.
      const fingerprint=items.map(i=>i.variantId+":"+i.quantity).sort().join("|");
      let saved:string|null=null;try{saved=sessionStorage.getItem("enjoylife_checkout_draft")}catch{}
      try{
        const entry=saved?JSON.parse(saved) as {fingerprint:string;key:string;createdAt:number}:null;
        if(entry?.fingerprint===fingerprint && Date.now()-entry.createdAt<3600000 && /^[0-9a-f-]{36}$/.test(entry.key)){
          idempotencyKey.current=entry.key;
        }
      }catch{}
      if(!idempotencyKey.current)idempotencyKey.current=crypto.randomUUID();
      try{sessionStorage.setItem("enjoylife_checkout_draft",JSON.stringify({fingerprint,key:idempotencyKey.current,createdAt:Date.now()}))}catch{}
    }
    const form = new FormData(e.currentTarget);
    try {
      const response = await fetch("/api/store/orders", { method: "POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({
        client_order_key:idempotencyKey.current,
        customer_name: String(form.get("name") ?? "").trim(),
        customer_phone: String(form.get("phone") ?? "").trim(),
        shipping_address: String(form.get("address") ?? "").trim(),
        note: String(form.get("note") ?? "").trim(),
        payment_method:method,
        items:items.map(i => ({variant_id:i.variantId,quantity:i.quantity}))
      })});
      const payload = await response.json();
      if(!response.ok) throw new Error(payload.error || "Không thể tạo đơn hàng. Vui lòng thử lại.");
      const order = payload as OrderResponse;
      if(!order.order_token) throw new Error("API không trả mã tra cứu đơn.");
      try{sessionStorage.removeItem("enjoylife_checkout_draft")}catch{}
      clear();
      if(method==="PAYOS"){
        try{
          const linkResponse=await fetch("/api/store/orders/"+order.order_token+"/payment-link",{method:"POST"});
          const link=await linkResponse.json();
          if(linkResponse.ok&&typeof link.checkout_url==="string"&&new URL(link.checkout_url).hostname==="pay.payos.vn"){
            window.location.assign(link.checkout_url);
            return;
          }
        }catch{ /* Order was created; keep its status page available for retry. */ }
      }
      router.push(`/orders/${encodeURIComponent(order.order_token)}`);
    } catch(err) { setError(err instanceof Error?err.message:"Lỗi kết nối, hãy kiểm tra API."); }
    finally { setBusy(false); }
  }
  return <div className="page-shell checkout-page"><Link className="back-link" href="/cart"><ArrowLeft size={16}/> TRỞ VỀ GIỎ HÀNG</Link><div className="checkout-top"><span className="eyebrow">ENJOY LIFE / THANH TOÁN</span><h1>Sắp thuộc<br/><em>về bạn.</em></h1><p>Hoàn thiện thông tin và chúng tôi sẽ chuẩn bị đơn của bạn.</p></div>
    {!items.length ? <div className="empty-state">Giỏ hàng trống. <Link href="/shop">Tiếp tục mua sắm ↗</Link></div> : <div className="checkout-layout"><form className="checkout-form" onSubmit={submit}><h2>01. Thông tin nhận hàng</h2><div className="field"><label htmlFor="customer-name">Họ và tên *</label><input id="customer-name" name="name" minLength={2} maxLength={100} required autoComplete="name" placeholder="Nguyễn Văn A"/></div><div className="field"><label htmlFor="customer-phone">Số điện thoại *</label><input id="customer-phone" type="tel" name="phone" required minLength={9} maxLength={20} autoComplete="tel" placeholder="09xxxxxxxx"/></div><div className="field"><label htmlFor="customer-address">Địa chỉ giao hàng *</label><textarea id="customer-address" name="address" minLength={10} maxLength={300} required rows={3} placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố"/></div><div className="field"><label htmlFor="customer-note">Ghi chú (không bắt buộc)</label><textarea id="customer-note" name="note" rows={2} maxLength={500} placeholder="Ghi chú cho cửa hàng"/></div>
      <h2>02. Phương thức thanh toán</h2><label className="payment-option"><input type="radio" name="payment" checked={method==="COD"} onChange={()=>setMethod("COD")}/><span><strong>Thanh toán khi nhận hàng (COD)</strong><small>Nhân viên xác nhận đơn và chuẩn bị giao hàng.</small></span></label><label className={payosEnabled?"payment-option":"payment-option muted"}><input type="radio" name="payment" checked={method==="PAYOS"} onChange={()=>setMethod("PAYOS")} disabled={!payosEnabled}/><span><strong>Thanh toán mã QR qua payOS</strong><small>{payosEnabled?"Quét mã VietQR trên trang payOS. Đơn chỉ được ghi nhận đã thanh toán sau khi xác minh.":"Chưa bật kênh payOS. Vui lòng dùng COD."}</small></span></label>
      {error && <div role="alert" className="form-error">{error}</div>}
      <button className="button-dark full-width" disabled={busy} type="submit">{busy?"ĐANG XỬ LÝ...": method==="PAYOS"?"TIẾP TỤC ĐẾN QR":"XÁC NHẬN ĐẶT HÀNG"}<ArrowUpRight size={17}/></button><p className="checkout-disclaimer"><LockKeyhole size={13}/> {payosEnabled?"Đơn giá được máy chủ kiểm tra lại. Thanh toán QR được xử lý trên trang bảo mật payOS.":"Môi trường demo: không nhập thông tin cá nhân thật khi thử nghiệm."}</p>
    </form><aside className="bag-summary checkout-summary"><h2>Đơn hàng của bạn</h2>{items.map(item=><div className="checkout-order-item" key={item.variantId}><span>{item.name}<small>{item.color} / {item.size} × {item.quantity}</small></span><strong>{money(item.price*item.quantity)}</strong></div>)}<div className="summary-line total"><span>Tổng tiền hàng</span><strong>{money(total)}</strong></div><p>Phí vận chuyển chưa bao gồm, sẽ xác nhận khi xử lý đơn. Backend tự kiểm tra lại tồn kho và đơn giá.</p></aside></div>}</div>;
}

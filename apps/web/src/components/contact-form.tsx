"use client";

import {useState, type FormEvent} from "react";
import {ArrowUpRight, CheckCircle2} from "lucide-react";

// Formspree form identifiers are intentionally public; the target email
// remains configured and verified in the Formspree dashboard.
export const CONTACT_FORM_ENDPOINT = "https://formspree.io/f/meaeydne";

type SubmissionState = "idle" | "sending" | "success" | "error";

export function ContactForm() {
  const [state, setState] = useState<SubmissionState>("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;

    const form = event.currentTarget;
    const values = new FormData(form);
    const name = String(values.get("name") ?? "").trim();
    const email = String(values.get("email") ?? "").trim();
    const message = String(values.get("message") ?? "").trim();
    if (name.length < 2 || name.length > 100 || email.length > 254 || message.length < 10 || message.length > 3000) {
      setError("Vui lòng nhập họ tên và lời nhắn hợp lệ (10–3000 ký tự).");
      setState("error");
      return;
    }

    values.set("name", name);
    values.set("email", email);
    values.set("message", message);
    setState("sending");
    setError("");

    try {
      const response = await fetch(CONTACT_FORM_ENDPOINT, {
        method: "POST",
        body: values,
        headers: {Accept: "application/json"},
      });
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Có quá nhiều lời nhắn được gửi. Vui lòng thử lại sau ít phút.");
        }
        if (response.status === 400 || response.status === 422) {
          throw new Error("Lời nhắn chưa hợp lệ. Vui lòng kiểm tra và thử lại.");
        }
        throw new Error("Không thể gửi lời nhắn lúc này. Vui lòng thử lại sau.");
      }
      form.reset();
      setState("success");
    } catch (reason) {
      setState("error");
      setError(reason instanceof Error ? reason.message : "Lỗi kết nối. Vui lòng thử lại.");
    }
  }

  return (
    <form
      id="enjoy-contact-form"
      className="enjoy-contact-form"
      method="POST"
      action={CONTACT_FORM_ENDPOINT}
      onSubmit={(event) => {void submit(event);}}
      aria-label="Gửi lời nhắn cho Enjoy Life"
    >
      <div className="enjoy-contact-fields">
        <label htmlFor="contact-name">HỌ VÀ TÊN
          <input id="contact-name" name="name" type="text" autoComplete="name" placeholder="Tên của bạn" required minLength={2} maxLength={100} disabled={state === "sending"}/>
        </label>
        <label htmlFor="contact-email">EMAIL
          <input id="contact-email" name="email" type="email" autoComplete="email" placeholder="ban@example.com" required maxLength={254} disabled={state === "sending"}/>
        </label>
      </div>
      <label htmlFor="contact-topic">BẠN MUỐN TRAO ĐỔI VỀ
        <select id="contact-topic" name="topic" defaultValue="Sản phẩm và tư vấn" disabled={state === "sending"}>
          <option>Sản phẩm và tư vấn</option>
          <option>Đơn hàng và vận chuyển</option>
          <option>Đổi trả và chính sách</option>
          <option>Góp ý khác</option>
        </select>
      </label>
      <label htmlFor="contact-message">NỘI DUNG LỜI NHẮN
        <textarea id="contact-message" name="message" rows={4} placeholder="Hãy chia sẻ điều bạn cần hỗ trợ..." required minLength={10} maxLength={3000} disabled={state === "sending"}/>
      </label>
      <div className="enjoy-contact-honeypot" aria-hidden="true">
        <label htmlFor="contact-gotcha">Để trống ô này
          <input id="contact-gotcha" name="_gotcha" type="text" tabIndex={-1} autoComplete="off"/>
        </label>
      </div>
      <div className="enjoy-contact-submit">
        <p>Thông tin của bạn chỉ được dùng để phản hồi yêu cầu liên hệ.</p>
        <button className="contact-primary" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "ĐANG GỬI..." : "GỬI LỜI NHẮN"}
          <ArrowUpRight size={18} aria-hidden="true"/>
        </button>
      </div>
      <div className="enjoy-contact-status" role="status" aria-live="polite" aria-atomic="true">
        {state === "success" && <p className="enjoy-contact-success"><CheckCircle2 size={18} aria-hidden="true"/> Lời nhắn đã được gửi. Enjoy Life sẽ phản hồi qua email của bạn.</p>}
        {state === "error" && <p className="enjoy-contact-error">{error}</p>}
      </div>
    </form>
  );
}

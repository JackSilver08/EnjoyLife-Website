"use client";

import {useState} from "react";
import Image from "next/image";
import Link from "next/link";
import {ArrowUpRight} from "lucide-react";
import {money} from "@/lib/format";
import type {Product} from "@/lib/types";

/**
 * Read-only, DB-backed product discovery. No independent price/stock cache,
 * mutations, cart actions or new API requests. Selecting a look changes only
 * what is shown locally; the CTA goes to the existing product detail route.
 */
export function HomeEditorialLookbook({products}:{products:Product[]}) {
  const [selected, setSelected] = useState(0);
  if (!products.length) return null;
  const active = products[Math.min(selected, products.length - 1)];
  const soldOut = typeof active.available === "number" && active.available <= 0;

  return <section className="home-lookbook" id="lookbook" aria-labelledby="lookbook-title">
    <div className="page-shell">
      <div className="home-lookbook-heading" data-cinematic-reveal>
        <span className="eyebrow">03 / THE DAILY EDIT</span>
        <h2 id="lookbook-title">Phối theo <em>cảm hứng.</em></h2>
        <p>Mỗi ngày một lựa chọn. Khám phá những thiết kế có thật từ Enjoy Life.</p>
      </div>
      <div className="home-lookbook-layout">
        <div className="home-lookbook-stage" aria-live="polite" aria-atomic="true">
          <div className="home-lookbook-stage-photo">
            <Image key={active.id} src={active.image_url} fill sizes="(max-width: 720px) 100vw, (max-width: 1080px) 55vw, 720px"
              alt={active.name} className="home-lookbook-image" />
            <span className="home-lookbook-stage-label" aria-hidden="true">ENJOY LIFE / THE DAILY EDIT</span>
            <span className="home-lookbook-stage-index" aria-hidden="true">{String(selected+1).padStart(2,"0")} / {String(products.length).padStart(2,"0")}</span>
          </div>
        </div>
        <div className="home-lookbook-details">
          <span className="eyebrow">CURATED FROM OUR COLLECTION</span>
          <p className="home-lookbook-overline">LOOK {String(selected+1).padStart(2,"0")}</p>
          <h3>{active.name}</h3>
          <p className="home-lookbook-description">{active.description || "Một lựa chọn dành cho những ngày bạn muốn là chính mình."}</p>
          <span className="home-lookbook-price">{money(active.price_vnd)}</span>
          {soldOut && <span className="home-lookbook-sold-out">HIỆN HẾT HÀNG</span>}
          <Link className="home-lookbook-cta" href={`/products/${encodeURIComponent(active.slug)}`}>
            KHÁM PHÁ SẢN PHẨM <ArrowUpRight size={19} aria-hidden="true"/>
          </Link>
          <div className="home-lookbook-choices" role="group" aria-label="Chọn thiết kế để xem">
            {products.map((product, index) =>
              <button key={product.id} type="button" className={index===selected?"home-lookbook-choice is-active":"home-lookbook-choice"}
                onClick={()=>setSelected(index)} aria-pressed={index===selected}
                aria-label={`Xem thiết kế ${index+1}: ${product.name}`}>
                <Image src={product.image_url} alt="" fill sizes="80px" />
                <span>{String(index+1).padStart(2,"0")}</span>
              </button>
            )}
          </div>
          <Link className="home-lookbook-all" href="/shop">XEM TOÀN BỘ CỬA HÀNG <ArrowUpRight size={16} aria-hidden="true"/></Link>
        </div>
      </div>
    </div>
  </section>;
}

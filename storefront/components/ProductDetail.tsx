"use client"
import Link from "next/link"
import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { money, packOf } from "@/lib/format"
import type { Product } from "@/lib/types"
import { useStore } from "@/app/store"
import { Icon } from "./Icon"
import { Qty } from "./Qty"

/** Product panel: large photo plus details, opened from a catalog card. Escape, the × or the backdrop close it. */
export function ProductDetail({ p, onClose }: { p: Product; onClose: () => void }) {
  const { quantityOf } = useStore()
  const closeRef = useRef<HTMLButtonElement>(null)
  const v = p.variants[0]
  const price = v?.calculated_price?.calculated_amount
  const pack = packOf(p.subtitle, v?.title ?? "")
  const category = p.categories?.[0]?.name
  const q = v ? quantityOf(v.id) : 0
  const image = p.thumbnail

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const t = setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 30)
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose() } }
    window.addEventListener("keydown", key)
    return () => { document.body.style.overflow = prev; clearTimeout(t); window.removeEventListener("keydown", key) }
  }, [onClose])

  return createPortal(
    <div className="cj pd-root">
      <div className="pd-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className="pd" role="dialog" aria-modal="true" aria-labelledby="pd-title">
          <button type="button" ref={closeRef} className="pd-close" aria-label="Close product details" onClick={onClose}><Icon n="close" size={18} /></button>
          <div className="pd-media">{image ? <img src={image} alt={p.title} /> : <span aria-hidden="true"><Icon n={category ?? "all"} size={64} /></span>}</div>
          <div className="pd-info">
            {category && <div className="eyebrow">{category.toUpperCase()}</div>}
            <h2 id="pd-title">{p.title}</h2>
            {pack && <p className="pd-pack">{pack}</p>}
            <div className="pd-price"><b>{price != null ? money(price) : "Ask for price"}</b>{price != null && <span>per pack</span>}</div>
            {p.description && <p className="pd-desc">{p.description}</p>}
            {price != null && v && (
              <div className="pd-buy"><Qty variantId={v.id} title={p.title} /><span className="dim">{q ? `${q} in cart · ${money(price * q)}` : "Add to your order"}</span></div>
            )}
            <dl className="pd-facts">
              {v?.sku && <div><dt>SKU</dt><dd>{v.sku}</dd></div>}
              {category && <div><dt>Category</dt><dd>{category}</dd></div>}
              {pack && <div><dt>Pack size</dt><dd>{pack}</dd></div>}
              <div><dt>Fulfillment</dt><dd>Pickup or local delivery</dd></div>
              <div><dt>Payment</dt><dd>Invoice by email</dd></div>
            </dl>
            {q > 0 && <Link className="primary wide" href="/cart" onClick={onClose}>View cart <Icon n="arrow" size={17} /></Link>}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

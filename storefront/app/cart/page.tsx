"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { api } from "@/lib/api"
import { money, packOf } from "@/lib/format"
import type { Address } from "@/lib/types"
import { useStore } from "../store"
import { Icon } from "@/components/Icon"
import { Req, Page, Title } from "@/components/Page"
import { Photo } from "@/components/Photo"
import { Qty } from "@/components/Qty"

const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) }

/** Slides a cart row out, fades it and collapses its height so the rows below glide up. */
function vanish(row: HTMLElement | null | undefined, delay = 0) {
  return new Promise<void>((done) => {
    if (!row || !row.animate || matchMedia("(prefers-reduced-motion: reduce)").matches) return done()
    const h = row.offsetHeight
    row.style.pointerEvents = "none"; row.style.overflow = "hidden"
    const a = row.animate([
      { opacity: 1, transform: "none", height: `${h}px`, easing: "ease-out" },
      { opacity: 0, transform: "translateX(16px)", height: `${h}px`, offset: 0.42, easing: "cubic-bezier(.4,0,.2,1)" },
      { opacity: 0, transform: "translateX(16px)", height: "0px", paddingTop: "0px", paddingBottom: "0px", borderBottomWidth: "0px" },
    ], { duration: 460, delay, easing: "linear", fill: "forwards" })
    a.onfinish = a.oncancel = () => done()
  })
}

export default function CartPage() {
  const { cart, customer, ready, busy, forgetCart, quantityOf, setQuantity, whenIdle } = useStore()
  const listRef = useRef<HTMLElement>(null)
  const leaving = useRef(new Set<string>())
  const removeLine = (variantId: string) => {
    if (leaving.current.has(variantId)) return
    leaving.current.add(variantId)
    const row = listRef.current?.querySelector<HTMLElement>(`.cartline[data-id="${CSS.escape(variantId)}"]`)
    vanish(row).then(() => { leaving.current.delete(variantId); setQuantity(variantId, 0) })
  }
  const clearCart = () => {
    const rows = [...(listRef.current?.querySelectorAll<HTMLElement>(".cartline") ?? [])]
    Promise.all(rows.map((row, i) => vanish(row, i * 45))).then(() => { forgetCart(); setConfirmClear(false) })
  }
  const router = useRouter()
  const saved = customer?.addresses?.[0]
  const [mode, setMode] = useState<"pickup" | "delivery">("pickup")
  const [addr, setAddr] = useState<Address>({})
  const [date, setDate] = useState("")
  const [notes, setNotes] = useState("")
  const [placing, setPlacing] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [error, setError] = useState("")
  const [verification, setVerification] = useState<{ id: string; verified: boolean } | null>(null)
  const [verifyError, setVerifyError] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!customer) return
    let live = true
    const load = () => {
      setVerifyError(false)
      api<{ verified: boolean }>("/store/cj/email-verification")
        .then(d => { if (live) setVerification({ id: customer.id, verified: d.verified }) })
        .catch(() => { if (live) { setVerification(null); setVerifyError(true) } })
    }
    load()
    window.addEventListener("focus", load)
    return () => { live = false; window.removeEventListener("focus", load) }
  }, [customer?.id, customer?.email, retry])
  const emailVerified = !!customer && verification?.id === customer.id && verification.verified

  useEffect(() => { if (saved) setAddr({ address_1: saved.address_1, address_2: saved.address_2, city: saved.city, province: saved.province, postal_code: saved.postal_code }) }, [saved?.id])

  const items = (cart?.items ?? []).filter((i) => quantityOf(i.variant_id) > 0)
  const subtotal = items.reduce((n, i) => n + Number(i.unit_price) * quantityOf(i.variant_id), 0)
  const units = items.length
  const needsAddress = mode === "delivery" && !(addr.address_1?.trim() && addr.city?.trim() && addr.postal_code?.trim())
  const profileMissing = !!customer && (!customer.company_name || !customer.phone)

  async function place(e: React.FormEvent) {
    e.preventDefault()
    if (!cart || !customer || !emailVerified || needsAddress || placing) return
    setPlacing(true); setError("")
    try {
      await whenIdle()
      const base = saved ?? {}
      const address = {
        company: customer.company_name || "", first_name: customer.first_name || "", last_name: customer.last_name || "",
        phone: customer.phone || "", country_code: "us",
        address_1: (mode === "delivery" ? addr.address_1 : base.address_1) || "", address_2: (mode === "delivery" ? addr.address_2 : base.address_2) || "",
        city: (mode === "delivery" ? addr.city : base.city) || "", province: (mode === "delivery" ? addr.province : base.province) || "",
        postal_code: (mode === "delivery" ? addr.postal_code : base.postal_code) || "",
      }
      await api(`/store/carts/${cart.id}`, { method: "POST", body: {
        email: customer.email, shipping_address: address, billing_address: address,
        metadata: { cj_fulfillment: mode, cj_requested_date: date, cj_notes: notes.trim() },
      } })
      const { shipping_options } = await api<{ shipping_options: { id: string; name: string }[] }>(`/store/shipping-options?cart_id=${cart.id}`)
      const option = shipping_options.find((o) => (mode === "pickup") === /pick/i.test(o.name))
      if (!option) throw new Error(`${mode === "pickup" ? "Pickup" : "Delivery"} isn't available right now.`)
      await api(`/store/carts/${cart.id}/shipping-methods`, { method: "POST", body: { option_id: option.id } })
      const { payment_collection } = await api<{ payment_collection: { id: string } }>("/store/payment-collections", { method: "POST", body: { cart_id: cart.id } })
      await api(`/store/payment-collections/${payment_collection.id}/payment-sessions`, { method: "POST", body: { provider_id: "pp_system_default" } })
      const done = await api<{ type: string; order?: { id: string }; error?: { message: string } }>(`/store/carts/${cart.id}/complete`, { method: "POST" })
      if (done.type !== "order" || !done.order) throw new Error(done.error?.message || "The order couldn't be placed.")
      forgetCart()
      router.push(`/orders/${done.order.id}?placed=1`)
    } catch (err) {
      setError((err as Error).message)
      setPlacing(false)
    }
  }

  if (!ready) return <Page><Title eyebrow="YOUR ORDER" name="Cart" /></Page>
  if (!items.length) return (
    <Page>
      <Title eyebrow="YOUR ORDER" name="Cart" />
      <div className="surface empty"><Icon n="bag" size={28} /><h2>Your cart is empty</h2><p>Browse the catalog to add products.</p><Link className="primary" href="/">Browse catalog</Link></div>
    </Page>
  )

  return (
    <Page>
      <Title eyebrow="YOUR ORDER" name="Cart" sub={`${units} ${units === 1 ? "product" : "products"} in your order`} />
      <form className="orderlayout" onSubmit={place}>
        <section className="surface" ref={listRef}>
          <div className="carthead"><h2>Items in your order</h2><div className="cartactions"><Link className="textbtn" href="/">Continue shopping</Link><span className="cartsep" aria-hidden="true" /><button type="button" className="textbtn danger" onClick={() => setConfirmClear(true)}>Clear all</button></div></div>
          {confirmClear && (
            <div className="callout clearconfirm"><b>Remove all items from your cart?</b>
              <div className="actions"><button type="button" className="secondary" onClick={() => setConfirmClear(false)}>Keep items</button><button type="button" className="primary" onClick={clearCart}>Clear cart</button></div>
            </div>
          )}
          {items.map((i) => {
            const pack = packOf(i.product_subtitle, i.variant_title)
            return (
              <div className="cartline" key={i.id} data-id={i.variant_id}>
                <Photo src={i.thumbnail} alt={i.product_title} />
                <div><b>{i.product_title}</b>{pack && <small>{pack}</small>}<small>{money(i.unit_price)} each</small><button type="button" className="textbtn danger lineremove" aria-label={`Remove ${i.product_title} from cart`} onClick={() => removeLine(i.variant_id)}>Remove</button></div>
                <Qty variantId={i.variant_id} title={i.product_title} onRemove={() => removeLine(i.variant_id)} />
                <b>{money(Number(i.unit_price) * quantityOf(i.variant_id))}</b>
              </div>
            )
          })}
        </section>
        <section className="surface">
          <h2>Pickup or delivery</h2>
          <div className="seg" role="group" aria-label="Fulfillment method">
            <button type="button" className={mode === "pickup" ? "on" : ""} aria-pressed={mode === "pickup"} onClick={() => setMode("pickup")}><Icon n="bag" size={18} />Pickup</button>
            <button type="button" className={mode === "delivery" ? "on" : ""} aria-pressed={mode === "delivery"} onClick={() => setMode("delivery")}><Icon n="truck" size={18} />Delivery</button>
          </div>
          {mode === "pickup" ? <p className="dim">Pickup location and time are confirmed by staff.</p> : (
            <>
              <label>Business delivery address<Req /><input required value={addr.address_1 ?? ""} onChange={(e) => setAddr({ ...addr, address_1: e.target.value })} autoComplete="address-line1" placeholder="Street" /></label>
              <div className="row3">
                <label>City<Req /><input required value={addr.city ?? ""} onChange={(e) => setAddr({ ...addr, city: e.target.value })} autoComplete="address-level2" /></label>
                <label>State<input value={addr.province ?? ""} onChange={(e) => setAddr({ ...addr, province: e.target.value })} autoComplete="address-level1" maxLength={2} placeholder="CA" /></label>
                <label>ZIP<Req /><input required value={addr.postal_code ?? ""} onChange={(e) => setAddr({ ...addr, postal_code: e.target.value })} autoComplete="postal-code" inputMode="numeric" /></label>
              </div>
            </>
          )}
          <label>Requested date <small>(optional)</small><input type="date" min={tomorrow()} value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label>Order notes <small>(optional)</small><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery instructions or preferences" maxLength={500} /></label>
          <div className="line"><span>Merchandise subtotal</span><b>{money(subtotal)}</b></div>
          <div className="line total"><span>Estimated total</span><b>{money(subtotal)}</b></div>
          <p className="invoice"><Icon n="mail" size={18} /> Invoice by email. No payment collected here.</p>
          {error && <p className="notice" role="alert">{error}</p>}
          {!customer ? <Link className="primary wide" href="/account?next=/cart">Sign in to order</Link>
            : profileMissing ? <Link className="primary wide" href="/account?next=/cart">Add business name and phone</Link>
            : verifyError ? <button className="secondary wide" type="button" onClick={() => setRetry(n => n + 1)}>Retry email verification check</button>
            : verification?.id !== customer.id ? <p className="dim" role="status">Checking email verification…</p>
            : !emailVerified ? <><p className="dim">Verify {customer.email} before placing your order.</p><Link className="primary wide" href="/verify-email">Verify email</Link></>
            : <>
                <p className="dim">Ordering as <b>{customer.company_name}</b><br />{customer.email}</p>
                <button className="primary wide" type="submit" disabled={placing || busy || needsAddress}>{placing ? "Placing order…" : <>Place order <Icon n="arrow" size={18} /></>}</button>
              </>}
        </section>
      </form>
    </Page>
  )
}

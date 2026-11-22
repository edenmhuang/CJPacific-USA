"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { money } from "@/lib/format"
import type { Address } from "@/lib/types"
import { useStore } from "../store"
import { Icon } from "@/components/Icon"

const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) }

export default function CartPage() {
  const { cart, customer, ready, setQuantity, busy, forgetCart } = useStore()
  const router = useRouter()
  const saved = customer?.addresses?.[0]
  const [mode, setMode] = useState<"pickup" | "delivery">("pickup")
  const [addr, setAddr] = useState<Address>({})
  const [date, setDate] = useState("")
  const [notes, setNotes] = useState("")
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { if (saved) setAddr({ address_1: saved.address_1, address_2: saved.address_2, city: saved.city, province: saved.province, postal_code: saved.postal_code }) }, [saved?.id])

  const items = cart?.items ?? []
  const needsAddress = mode === "delivery" && !(addr.address_1?.trim() && addr.city?.trim() && addr.postal_code?.trim())
  const profileMissing = !!customer && (!customer.company_name || !customer.phone)

  async function place(e: React.FormEvent) {
    e.preventDefault()
    if (!cart || !customer || needsAddress || placing) return
    setPlacing(true); setError("")
    try {
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

  if (!ready) return <div className="narrow"><div className="card skeleton tall" /></div>
  if (!items.length) return (
    <div className="narrow center">
      <div className="bigicon"><Icon n="bag" size={30} /></div>
      <h1>Your cart is empty</h1>
      <Link className="primary" href="/">Browse the catalog</Link>
    </div>
  )

  return (
    <form className="cartpage" onSubmit={place}>
      <section>
        <h1>Cart</h1>
        <ul className="lines">
          {items.map((i) => (
            <li key={i.id}>
              <div className="thumb">{i.thumbnail ? <img src={i.thumbnail} alt="" /> : <Icon n="all" />}</div>
              <div className="grow"><b>{i.product_title}</b><span className="dim">{i.variant_title} · {money(i.unit_price)} each</span></div>
              <div className="stepper">
                <button type="button" disabled={busy} aria-label="Remove one" onClick={() => setQuantity(i.variant_id, i.quantity - 1)}><Icon n="minus" size={15} /></button>
                <span>{i.quantity}</span>
                <button type="button" disabled={busy} aria-label="Add one" onClick={() => setQuantity(i.variant_id, i.quantity + 1)}><Icon n="plus" size={15} /></button>
              </div>
              <b className="amt">{money(i.unit_price * i.quantity)}</b>
            </li>
          ))}
        </ul>
      </section>

      <aside className="panel">
        <h2>Order</h2>
        <div className="seg" role="radiogroup" aria-label="Fulfillment">
          <button type="button" role="radio" aria-checked={mode === "pickup"} className={mode === "pickup" ? "on" : ""} onClick={() => setMode("pickup")}><Icon n="store" size={17} />Pickup</button>
          <button type="button" role="radio" aria-checked={mode === "delivery"} className={mode === "delivery" ? "on" : ""} onClick={() => setMode("delivery")}><Icon n="truck" size={17} />Delivery</button>
        </div>
        {mode === "delivery" && (
          <div className="fields">
            <label>Street address<input required value={addr.address_1 ?? ""} onChange={(e) => setAddr({ ...addr, address_1: e.target.value })} autoComplete="address-line1" /></label>
            <div className="row3">
              <label>City<input required value={addr.city ?? ""} onChange={(e) => setAddr({ ...addr, city: e.target.value })} autoComplete="address-level2" /></label>
              <label>State<input value={addr.province ?? ""} onChange={(e) => setAddr({ ...addr, province: e.target.value })} autoComplete="address-level1" maxLength={2} placeholder="CA" /></label>
              <label>ZIP<input required value={addr.postal_code ?? ""} onChange={(e) => setAddr({ ...addr, postal_code: e.target.value })} autoComplete="postal-code" inputMode="numeric" /></label>
            </div>
          </div>
        )}
        <div className="fields">
          <label>Requested date <span className="dim">(optional)</span><input type="date" min={tomorrow()} value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label>Notes <span className="dim">(optional)</span><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gate code, substitutions…" maxLength={500} /></label>
        </div>
        <div className="total"><span>Estimated total</span><b>{money(cart?.item_total)}</b></div>
        <p className="dim small">Final amount on your emailed invoice.</p>
        {error && <p className="notice">{error}</p>}
        {!customer ? (
          <Link className="primary block" href="/account?next=/cart">Create account or sign in to order</Link>
        ) : profileMissing ? (
          <Link className="primary block" href="/account">Add business name and phone</Link>
        ) : (
          <button className="primary block" disabled={placing || busy || needsAddress}>{placing ? "Placing order…" : "Place order"}</button>
        )}
        {customer && <p className="dim small center">Ordering as {customer.company_name} · {customer.email}</p>}
      </aside>
    </form>
  )
}

"use client"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { CONTACT_EMAIL, day, dayTime, money } from "@/lib/format"
import type { Order } from "@/lib/types"
import { useStore } from "../../store"
import { Icon } from "@/components/Icon"

export default function OrderPage() {
  return <Suspense><OrderDetail /></Suspense>
}

function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const placed = useSearchParams().get("placed") === "1"
  const router = useRouter()
  const { customer, ready, addMany } = useStore()
  const [order, setOrder] = useState<Order | null>(null)
  const [err, setErr] = useState("")
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(placed ? "Order placed. A confirmation email is on its way." : "")

  const load = useCallback(() => api<{ order: Order }>(`/store/cj/orders/${id}`).then((d) => setOrder(d.order)).catch((e) => setErr(e.message)), [id])
  useEffect(() => {
    if (!customer) return
    load()
    const t = setInterval(load, 30000) // staff updates status in Medusa Admin
    return () => clearInterval(t)
  }, [customer?.id, load])

  const reorder = async () => {
    if (!order) return
    setBusy(true)
    const added = await addMany(order.items.map((i) => ({ variant_id: i.variant_id, quantity: i.quantity })))
    setBusy(false)
    if (added) router.push("/cart")
    else setNote("Those items aren't available anymore.")
  }

  const cancel = async () => {
    setBusy(true)
    try {
      await api(`/store/cj/orders/${id}/cancel`, { method: "POST" })
      setConfirm(false); setNote("Order cancelled. We emailed you and CJPacific.")
      await load()
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  if (!ready) return <div className="narrow"><div className="card skeleton tall" /></div>
  if (!customer) return <div className="narrow center"><h1>Sign in to see this order</h1><Link className="primary" href={`/account?next=/orders/${id}`}>Sign in</Link></div>
  if (err && !order) return <div className="narrow center"><h1>Order not found</h1><Link className="primary" href="/orders">All orders</Link></div>
  if (!order) return <div className="narrow"><div className="card skeleton tall" /></div>

  const mail = CONTACT_EMAIL ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Order ${order.ref}`)}&body=${encodeURIComponent(`Hello,\n\nI'm writing about order ${order.ref}.\n\n${customer.company_name ?? ""}`)}` : ""
  const a = order.shipping_address

  return (
    <div className="orderpage">
      <Link href="/orders" className="back"><Icon n="back" size={16} />Orders</Link>
      <div className="orderhead">
        <div><h1>{order.ref}</h1><p className="dim">{day(order.created_at)} · {order.fulfillment === "pickup" ? "Pickup" : "Delivery"}</p></div>
        <span className={`pill big ${order.canceled ? "bad" : order.stage >= 4 ? "done" : ""}`}>{order.status}</span>
      </div>
      {note && <p className="ok">{note}</p>}
      {err && <p className="notice">{err}</p>}

      <section className="panel">
        {order.canceled ? <p className="dim">This order was cancelled. No invoice will be sent.</p> : (
          <ol className="progress" aria-label="Order progress">
            {order.steps.map((s, i) => (
              <li key={s} className={i <= order.stage ? "lit" : ""} aria-current={i === order.stage ? "step" : undefined}>
                <b>{i < order.stage ? <Icon n="check" size={13} /> : i + 1}</b><span>{s}</span>
                {order.events.findLast?.((e) => e.stage === i && !e.label.startsWith("Moved")) && i <= order.stage && <small>{dayTime(order.events.findLast((e) => e.stage === i)!.at)}</small>}
              </li>
            ))}
          </ol>
        )}
        <div className="facts">
          <div><small>{order.fulfillment === "pickup" ? "Pickup" : "Deliver to"}</small><b>{order.fulfillment === "pickup" ? "Time confirmed by email" : [a?.address_1, a?.city, a?.postal_code].filter(Boolean).join(", ")}</b></div>
          <div><small>Requested</small><b>{order.requested_date ? day(order.requested_date + "T12:00:00") : "Any day"}</b></div>
          <div><small>Billing</small><b>Invoice by email</b></div>
        </div>
        {order.notes && <p className="dim">“{order.notes}”</p>}
        <div className="actions">
          <button className="primary" onClick={reorder} disabled={busy}>Reorder</button>
          {mail && <a className="ghost" href={mail}><Icon n="mail" size={16} />Contact us</a>}
          {order.can_cancel && !confirm && <button className="link danger" onClick={() => setConfirm(true)}>Cancel order</button>}
        </div>
        {confirm && (
          <div className="confirm">
            <b>Cancel {order.ref}?</b><span className="dim">This can't be undone.</span>
            <div className="actions"><button className="ghost" onClick={() => setConfirm(false)}>Keep order</button><button className="primary danger" onClick={cancel} disabled={busy}>Cancel order</button></div>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Items</h2>
        <ul className="lines compact">
          {order.items.map((i) => (
            <li key={i.id}>
              <div className="thumb">{i.thumbnail ? <img src={i.thumbnail} alt="" /> : <Icon n="all" />}</div>
              <div className="grow"><b>{i.quantity} × {i.product_title}</b><span className="dim">{i.variant_title} · {money(i.unit_price)} each</span></div>
              <b className="amt">{money(i.unit_price * i.quantity)}</b>
            </li>
          ))}
        </ul>
        <div className="total"><span>Estimated total</span><b>{money(order.total)}</b></div>
      </section>
    </div>
  )
}

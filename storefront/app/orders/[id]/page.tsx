"use client"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import { CONTACT_EMAIL, day, dayTime, money, packOf } from "@/lib/format"
import type { Order } from "@/lib/types"
import { useStore } from "../../store"
import { Icon } from "@/components/Icon"
import { Page, Title } from "@/components/Page"

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
      setConfirm(false); setNote("Order cancelled.")
      await load()
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  if (!ready) return <Page><div /></Page>
  if (!customer) return <Page><div className="surface empty"><Icon n="user" size={28} /><h2>Sign in to see this order</h2><Link className="primary" href={`/account?next=/orders/${id}`}>Sign in</Link></div></Page>
  if (err && !order) return <Page><div className="surface empty"><h2>Order not found</h2><Link className="primary" href="/orders">All orders</Link></div></Page>
  if (!order) return <Page><div /></Page>

  const mode = order.fulfillment === "pickup" ? "Pickup" : "Delivery"
  const mail = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Order inquiry · ${order.ref}`)}&body=${encodeURIComponent(`Hello,\n\nI’m writing about ${order.ref} (${mode.toLowerCase()}) for ${customer.company_name ?? ""}.\n\nThank you.`)}`
  const a = order.shipping_address

  return (
    <Page>
      <Link href="/orders" className="backlink"><Icon n="back" size={15} />Back to orders</Link>
      <Title eyebrow={`${mode.toUpperCase()} ORDER`} name={order.ref} sub={`${customer.company_name ?? ""} · ${day(order.created_at)}`} />
      {note && <div className="cj-feedback" role="status">{note}<button type="button" onClick={() => setNote("")} aria-label="Dismiss message">×</button></div>}
      {err && <p className="notice" role="alert">{err}</p>}
      <div className="orderlayout">
        <section className="surface">
          <h2>Order progress</h2>
          {order.canceled ? <div className="callout">Cancelled · No invoice will be sent.</div> : (
            <ol className="progress" aria-label="Order progress">
              {order.steps.map((s, i) => {
                const ev = order.events.filter((e) => e.stage === i && !e.label.startsWith("Moved")).at(-1)
                return (
                  <li key={s} className={i <= order.stage ? "lit" : ""} aria-current={i === order.stage ? "step" : undefined}>
                    <b>{i < order.stage ? <Icon n="check" size={13} /> : i + 1}</b><span>{s}</span>
                    {ev && i <= order.stage && <small>{dayTime(ev.at)}</small>}
                  </li>
                )
              })}
            </ol>
          )}
          <div className="rule" />
          <div className="orderfacts">
            <div><small>Fulfillment</small><strong>{order.fulfillment === "pickup" ? "Pickup · details after confirmation" : [a?.address_1, a?.city, a?.postal_code].filter(Boolean).join(", ")}</strong></div>
            <div><small>Requested date</small><strong>{order.requested_date ? day(order.requested_date + "T12:00:00") : "Not specified"}</strong></div>
            <div><small>Billing</small><strong>Invoice by email</strong></div>
          </div>
          {order.notes && <p className="dim">Order notes: {order.notes}</p>}
          <div className="actions">
            <button className="primary" onClick={reorder} disabled={busy}>Reorder</button>
            <a className="secondary" href={mail}>Contact about order</a>
            {order.can_cancel && !confirm && <button className="textbtn danger" onClick={() => setConfirm(true)}>Cancel order</button>}
          </div>
          {confirm && (
            <div className="callout"><b>Cancel {order.ref}?</b><p>This cannot be undone.</p>
              <div className="actions"><button className="secondary" onClick={() => setConfirm(false)}>Keep order</button><button className="primary" onClick={cancel} disabled={busy}>Yes, cancel order</button></div>
            </div>
          )}
        </section>
        <section className="surface">
          <h2>Order summary</h2>
          {order.items.map((i) => {
            const pack = packOf(i.product_subtitle, i.variant_title)
            return <div key={i.id} className="line"><span>{i.quantity} × {i.product_title}{pack && <small>{pack}</small>}</span><b>{money(Number(i.unit_price) * i.quantity)}</b></div>
          })}
          <div className="line total"><span>Estimated total</span><b>{money(order.total)}</b></div>
          <p className="dim">Final amount comes with the invoice.</p>
        </section>
      </div>
    </Page>
  )
}

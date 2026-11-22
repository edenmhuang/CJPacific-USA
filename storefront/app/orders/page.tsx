"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { day, money } from "@/lib/format"
import type { Order } from "@/lib/types"
import { useStore } from "../store"
import { Icon } from "@/components/Icon"
import { Page, Title } from "@/components/Page"

export default function OrdersPage() {
  const { customer, ready } = useStore()
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [err, setErr] = useState("")

  useEffect(() => {
    if (!customer) return
    api<{ orders: Order[] }>("/store/cj/orders").then((d) => setOrders(d.orders)).catch((e) => setErr(e.message))
  }, [customer?.id])

  if (!ready) return <Page><div /></Page>
  if (!customer) return (
    <Page>
      <div className="surface empty"><Icon n="user" size={28} /><h2>Sign in to see your orders</h2><p>Orders are only available in your business account.</p>
        <Link className="primary" href="/account?next=/orders">Sign in</Link></div>
    </Page>
  )
  return (
    <Page>
      <Title eyebrow="YOUR BUSINESS" name="Orders" sub="Track an order or rebuild it in your cart." />
      {err && <p className="notice" role="alert">{err}</p>}
      {orders && !orders.length ? (
        <div className="surface empty"><Icon n="order" size={28} /><h2>No orders yet</h2><p>Place an order and you’ll be able to track or reorder it here.</p><Link className="primary" href="/">Browse catalog</Link></div>
      ) : orders && (
        <div className="surface orderlist">
          {orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} className="orderrow">
              <span><b>{o.ref}</b><small>{o.fulfillment === "pickup" ? "Pickup" : "Delivery"} · {day(o.created_at)}</small></span>
              <span><b>{money(o.total)}</b><small>{o.items.length} items</small></span>
              <span className={o.canceled ? "pill quiet" : "pill"}>{o.status}</span>
              <Icon n="arrow" size={17} />
            </Link>
          ))}
        </div>
      )}
    </Page>
  )
}

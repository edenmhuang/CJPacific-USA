"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { day, money } from "@/lib/format"
import type { Order } from "@/lib/types"
import { useStore } from "../store"
import { Icon } from "@/components/Icon"

export default function OrdersPage() {
  const { customer, ready } = useStore()
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [err, setErr] = useState("")

  useEffect(() => {
    if (!customer) return
    api<{ orders: Order[] }>("/store/cj/orders").then((d) => setOrders(d.orders)).catch((e) => setErr(e.message))
  }, [customer?.id])

  if (!ready) return <div className="narrow"><div className="card skeleton tall" /></div>
  if (!customer) return (
    <div className="narrow center"><div className="bigicon"><Icon n="order" size={30} /></div><h1>Your orders</h1>
      <Link className="primary" href="/account?next=/orders">Sign in</Link></div>
  )
  return (
    <div className="narrow wide">
      <h1>Orders</h1>
      {err && <p className="notice">{err}</p>}
      {!orders && !err && <div className="card skeleton tall" />}
      {orders?.length === 0 && <p className="empty">No orders yet. <Link href="/">Browse the catalog</Link></p>}
      <ul className="orderlist">
        {orders?.map((o) => (
          <li key={o.id}>
            <Link href={`/orders/${o.id}`}>
              <div className="grow"><b>{o.ref}</b><span className="dim">{day(o.created_at)} · {o.fulfillment === "pickup" ? "Pickup" : "Delivery"} · {o.items.reduce((n, i) => n + i.quantity, 0)} units</span></div>
              <span className={`pill ${o.canceled ? "bad" : o.stage >= 4 ? "done" : ""}`}>{o.status}</span>
              <b className="amt">{money(o.total)}</b>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

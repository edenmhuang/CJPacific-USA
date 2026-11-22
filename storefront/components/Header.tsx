"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useStore } from "@/app/store"
import { Icon } from "./Icon"

export function Header() {
  const { cart, customer } = useStore()
  const path = usePathname()
  const count = cart?.items.reduce((n, i) => n + i.quantity, 0) ?? 0
  const nav = [
    { href: "/", label: "Catalog", icon: "all" },
    { href: "/orders", label: "Orders", icon: "order" },
    { href: "/account", label: customer ? customer.company_name || "Account" : "Sign in", icon: "user" },
  ]
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h))
  return (
    <header className="top">
      <div className="top-in">
        <Link href="/" className="brand"><span className="mark">CJ</span><span>CJPacific USA</span></Link>
        <nav className="nav">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={active(n.href) ? "on" : ""}><Icon n={n.icon} size={18} /><span>{n.label}</span></Link>
          ))}
        </nav>
        <Link href="/cart" className={`cartbtn ${active("/cart") ? "on" : ""}`} aria-label={`Cart, ${count} items`}>
          <Icon n="bag" size={18} /><span>{count > 0 ? count : "Cart"}</span>
        </Link>
      </div>
    </header>
  )
}

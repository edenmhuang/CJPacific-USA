"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useStore } from "@/app/store"
import { Icon } from "./Icon"

const NAV = [
  { href: "/", label: "Catalog" },
  { href: "/orders", label: "Orders", icon: "order" },
  { href: "/account", label: "Account", icon: "user" },
  { href: "/contact", label: "Contact" },
]

export function Header() {
  const { count, query, setQuery } = useStore()
  const path = usePathname()
  const router = useRouter()
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h))
  return (
    <header className="cj-header">
      <div className="cj-head-inner">
        <Link href="/" className="brand" aria-label="CJPacific USA catalog"><span>CJPacific <small>USA</small></span></Link>
        <label className="cj-search">
          <Icon n="search" size={18} />
          <input aria-label="Search products" placeholder="Search products, categories, or SKUs" value={query}
            onChange={(e) => { setQuery(e.target.value); if (path !== "/") router.push("/") }} />
          {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}>×</button>}
        </label>
        <nav className="cj-nav" aria-label="Main navigation">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={active(n.href) ? "active" : ""} aria-current={active(n.href) ? "page" : undefined}>
              {n.icon && <Icon n={n.icon} size={17} />}<span>{n.label}</span>
            </Link>
          ))}
          <Link href="/cart" className={`cartnav${active("/cart") ? " active" : ""}`} aria-current={active("/cart") ? "page" : undefined} aria-label={`Cart, ${count} items`}>
            <Icon n="bag" size={17} /><span>Cart</span>{count > 0 && <b key={count} className="pop">{count}</b>}
          </Link>
        </nav>
      </div>
    </header>
  )
}

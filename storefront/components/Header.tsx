"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useStore } from "@/app/store"
import { Icon } from "./Icon"

const NAV = [
  { href: "/", label: "Catalog" },
  { href: "/orders", label: "Orders", icon: "order" },
  { href: "/account", label: "Account", icon: "user" },
]

/** Two letters for the signed-in business: "Golden Wok" → "GW", "chef@x.com" → "CH". */
function initials(name: string) {
  const words = name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean)
  return ((words.length > 1 ? words[0][0] + words[1][0] : (words[0] || "?").slice(0, 2))).toUpperCase()
}

export function Header() {
  const { count, query, setQuery, customer, ready } = useStore()
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
            <Link key={n.href} href={n.href} className={[active(n.href) ? "active" : "", n.href === "/account" && customer ? "signedin" : ""].join(" ").trim()} aria-current={active(n.href) ? "page" : undefined}
              aria-label={n.href === "/account" && customer ? `Account: signed in as ${customer.company_name || customer.email}` : undefined}>
              {n.href === "/account" && ready && customer
                ? <><span className="avatar" aria-hidden="true">{customer.company_name || customer.first_name ? initials(customer.company_name || customer.first_name || "") : <Icon n="user" size={14} />}</span>
                    <span className="acctname" title={`Signed in as ${customer.company_name || customer.email}`}>{customer.company_name || customer.first_name || "My account"}</span></>
                : <>{n.icon && <Icon n={n.icon} size={17} />}
                    <span className={n.href === "/account" ? "acctname" : undefined}>{n.href === "/account" && ready ? "Sign in" : n.label}</span></>}
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

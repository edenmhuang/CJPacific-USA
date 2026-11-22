"use client"
import { useEffect, useMemo, useState } from "react"
import { api } from "@/lib/api"
import { money } from "@/lib/format"
import type { Category, Product } from "@/lib/types"
import { useStore } from "./store"
import { Icon } from "@/components/Icon"

const FIELDS = "id,title,handle,thumbnail,metadata,*categories,variants.id,variants.title,variants.sku,*variants.calculated_price"

export default function Catalog() {
  const { regionId, ready } = useStore()
  const [products, setProducts] = useState<Product[] | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [cat, setCat] = useState("all")
  const [q, setQ] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!ready) return
    if (!regionId) { setError("The catalog is unavailable right now."); return }
    Promise.all([
      api<{ products: Product[] }>(`/store/products?limit=500&region_id=${regionId}&fields=${FIELDS}`, { auth: null }),
      api<{ product_categories: Category[] }>("/store/product-categories?limit=100&fields=id,name,rank", { auth: null }),
    ]).then(([p, c]) => {
      setProducts(p.products)
      setCategories(c.product_categories.sort((a, b) => a.rank - b.rank))
    }).catch(() => setError("The catalog is unavailable right now."))
  }, [ready, regionId])

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (products ?? []).filter((p) =>
      (cat === "all" || p.categories?.some((c) => c.id === cat)) &&
      (!term || `${p.title} ${p.metadata?.pack ?? ""} ${p.variants.map((v) => v.sku).join(" ")} ${p.categories?.map((c) => c.name).join(" ")}`.toLowerCase().includes(term)))
  }, [products, cat, q])

  const rank = (p: Product) => categories.find((c) => c.id === p.categories?.[0]?.id)?.rank ?? 99
  const sorted = [...shown].sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title))

  return (
    <div className="catalog">
      <div className="hero">
        <h1>Wholesale ordering</h1>
        <p>Pickup or local delivery. Invoiced by email.</p>
        <label className="search">
          <Icon n="search" size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products or SKU" aria-label="Search products" />
        </label>
      </div>
      <div className="chips" role="tablist" aria-label="Categories">
        <button role="tab" aria-selected={cat === "all"} className={cat === "all" ? "on" : ""} onClick={() => setCat("all")}><Icon n="all" size={16} />All</button>
        {categories.map((c) => (
          <button key={c.id} role="tab" aria-selected={cat === c.id} className={cat === c.id ? "on" : ""} onClick={() => setCat(c.id)}><Icon n={c.name} size={16} />{c.name}</button>
        ))}
      </div>
      {error && <p className="notice">{error}</p>}
      {!products && !error && <div className="grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="card skeleton" />)}</div>}
      {products && shown.length === 0 && <p className="empty">No products match “{q}”.</p>}
      {sorted.length > 0 && <div className="grid">{sorted.map((p) => <ProductCard key={p.id} p={p} showCategory={cat === "all"} />)}</div>}
    </div>
  )
}

function ProductCard({ p, showCategory }: { p: Product; showCategory: boolean }) {
  const { quantityOf, setQuantity, busy } = useStore()
  const v = p.variants[0]
  const q = v ? quantityOf(v.id) : 0
  const unit = p.metadata?.unit || "item"
  const price = v?.calculated_price?.calculated_amount
  const [failed, setFailed] = useState(false)
  if (!v) return null
  return (
    <article className="card">
      <div className="photo">
        {p.thumbnail && !failed ? <img src={p.thumbnail} alt={p.title} loading="lazy" onError={() => setFailed(true)} /> : <Icon n={p.categories?.[0]?.name || "all"} size={34} />}
      </div>
      <div className="card-b">
        {showCategory && p.categories?.[0] && <span className="eyebrow">{p.categories[0].name}</span>}
        <h3>{p.title}</h3>
        <p className="dim">{p.metadata?.pack || v.title}</p>
        <div className="buy">
          <span className="price">{price != null ? money(price) : "Ask"}<small>/{unit}</small></span>
          {q > 0 ? (
            <div className="stepper">
              <button disabled={busy} aria-label={`Remove one ${unit}`} onClick={() => setQuantity(v.id, q - 1)}><Icon n="minus" size={15} /></button>
              <span>{q}</span>
              <button disabled={busy} aria-label={`Add one ${unit}`} onClick={() => setQuantity(v.id, q + 1)}><Icon n="plus" size={15} /></button>
            </div>
          ) : (
            <button className="add" disabled={busy} aria-label={`Add ${p.title}`} onClick={() => setQuantity(v.id, 1)}><Icon n="plus" size={18} /></button>
          )}
        </div>
      </div>
    </article>
  )
}

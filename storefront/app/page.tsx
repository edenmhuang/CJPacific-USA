"use client"
import Link from "next/link"
import { Footer } from "@/components/Footer"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { api } from "@/lib/api"
import { money, outOfStock, packOf } from "@/lib/format"
import { StockLabel } from "@/components/StockLabel"
import type { Category, Product } from "@/lib/types"
import { useStore } from "./store"
import { Icon } from "@/components/Icon"
import { Photo } from "@/components/Photo"
import { Qty } from "@/components/Qty"
import { ProductDetail } from "@/components/ProductDetail"
import { FavButton } from "@/components/FavButton"

const FIELDS = "id,title,subtitle,description,handle,thumbnail,metadata,*categories,variants.id,variants.title,variants.sku,variants.manage_inventory,variants.allow_backorder,+variants.inventory_quantity,*variants.calculated_price"
const REFRESH_MS = 60_000

export default function Catalog() {
  const { regionId, ready, query, setQuery, customer, favorites } = useStore()
  const [products, setProducts] = useState<Product[] | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [cat, setCat] = useState("all")
  const [error, setError] = useState("")
  // Open product panel, kept in ?product= so Back closes it and links can share it.
  const [detail, setDetail] = useState("")
  const opener = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const sync = () => {
      const id = new URLSearchParams(location.search).get("product") ?? ""
      setDetail(id)
      if (!id) opener.current?.focus({ preventScroll: true })
    }
    sync()
    window.addEventListener("popstate", sync)
    return () => window.removeEventListener("popstate", sync)
  }, [])
  const openProduct = useCallback((id: string, el: HTMLElement) => {
    opener.current = el
    const u = new URL(location.href); u.searchParams.set("product", id)
    history.pushState(history.state, "", u)
    setDetail(id)
  }, [])
  const closeProduct = useCallback(() => {
    if (new URLSearchParams(location.search).get("product")) history.back()
    else setDetail("")
  }, [])

  // Products, prices, photos and categories come straight from Medusa, so Admin edits show up here.
  const load = useCallback(async () => {
    if (!regionId) return
    try {
      const [p, c] = await Promise.all([
        api<{ products: Product[] }>(`/store/products?limit=500&region_id=${regionId}&fields=${FIELDS}`, { auth: null }),
        api<{ product_categories: Category[] }>("/store/product-categories?limit=100&fields=id,name,rank", { auth: null }),
      ])
      setProducts(p.products)
      setCategories(c.product_categories.sort((a, b) => a.rank - b.rank))
      setError("")
    } catch {
      setError("The catalog is unavailable right now.")
    }
  }, [regionId])

  useEffect(() => {
    if (!ready) return
    if (!regionId) { setError("The catalog is unavailable right now."); return }
    load()
    const timer = setInterval(load, REFRESH_MS)
    const onShow = () => { if (document.visibilityState === "visible") load() }
    window.addEventListener("focus", onShow)
    document.addEventListener("visibilitychange", onShow)
    return () => { clearInterval(timer); window.removeEventListener("focus", onShow); document.removeEventListener("visibilitychange", onShow) }
  }, [ready, regionId, load])

  const favSet = useMemo(() => new Set(customer ? favorites : []), [customer, favorites])
  const rank = useCallback((p: Product) => categories.find((c) => c.id === p.categories?.[0]?.id)?.rank ?? 99, [categories])
  const shown = useMemo(() => {
    const term = query.trim().toLowerCase()
    return (products ?? [])
      .filter((p) => p.variants?.length)
      .filter((p) => (cat === "all" || (cat === "favorites" ? favSet.has(p.id) : p.categories?.some((c) => c.id === cat))) &&
        (!term || `${p.title} ${p.subtitle ?? ""} ${p.variants.map((v) => `${v.sku ?? ""} ${v.title}`).join(" ")} ${p.categories?.map((c) => c.name).join(" ")}`.toLowerCase().includes(term)))
      .sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title))
  }, [products, cat, query, rank, favSet])
  const catName = cat === "all" ? "All products" : cat === "favorites" ? "Favorites" : categories.find((c) => c.id === cat)?.name ?? "All products"
  const favCount = customer ? (products ?? []).filter((p) => favSet.has(p.id)).length : 0

  return (
    <main className="cj-main browse">
      <aside className="categories" aria-label="Categories">
        <div className="eyebrow">SHOP BY CATEGORY</div>
        <button className={cat === "favorites" ? "chosen" : ""} aria-pressed={cat === "favorites"} onClick={() => setCat("favorites")}><Icon n="heart" size={19} />Favorites{favCount > 0 && <span className="count">{favCount}</span>}</button>
        <button className={cat === "all" ? "chosen" : ""} aria-pressed={cat === "all"} onClick={() => setCat("all")}><Icon n="all" size={19} />All products</button>
        {categories.map((c) => (
          <button key={c.id} className={cat === c.id ? "chosen" : ""} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}><Icon n={c.name} size={19} />{c.name}</button>
        ))}
        <Link className="sidelink" href="/about"><Icon n="info" size={19} />About Us</Link>
        <Link className="sidelink" href="/contact"><Icon n="phone" size={19} />Contact Us</Link>
        <div className="sidefoot"><Icon n="mail" size={19} /><div><b>Invoiced by email</b><small>No payment at checkout</small></div></div>
      </aside>
      <div className="shelf">
        <div className="shelfhead">
          <div><div className="eyebrow">THE CATALOG</div><h2>{query.trim() ? "Search results" : catName}</h2></div>
          {products && <small>{shown.length} {shown.length === 1 ? "product" : "products"}</small>}
        </div>
        {error && !products ? <p role="alert" className="notice">{error}</p>
          : !products ? <div className="cj-grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="product skeleton" />)}</div>
          : !shown.length && cat === "favorites" && !query.trim() ? (
            !customer
              ? <div className="surface empty"><Icon n="heart" size={28} /><h2>Sign in to see your favorites</h2><p>Tap ♥ on any product to save it.</p><Link className="primary" href="/account?reason=favorites">Sign in</Link></div>
              : <div className="surface empty"><Icon n="heart" size={28} /><h2>No favorites yet</h2><p>Tap ♥ on any product to save it here.</p><button className="secondary" onClick={() => setCat("all")}>Browse all products</button></div>
          ) : !shown.length ? (
            <div className="surface empty"><h2>No matching products</h2>
              <button className="secondary" onClick={() => { setQuery(""); setCat("all") }}>Clear filters</button></div>
          ) : <div className="cj-grid" key={cat}>{shown.map((p) => <ProductCard key={p.id} p={p} onOpen={openProduct} />)}</div>}
        <Footer inShelf />
      </div>
      {(() => { const p = products?.find((x) => x.id === detail); return p ? <ProductDetail p={p} onClose={closeProduct} /> : null })()}
    </main>
  )
}

function ProductCard({ p, onOpen }: { p: Product; onOpen: (id: string, el: HTMLElement) => void }) {
  const v = p.variants[0]
  const price = v.calculated_price?.calculated_amount
  const pack = packOf(p.subtitle, v.title)
  const category = p.categories?.[0]?.name
  const out = outOfStock(p)
  return (
    <article className="product">
      <FavButton id={p.id} title={p.title} />
      <button type="button" className="product-open" aria-label={`View details for ${p.title}`} onClick={(e) => onOpen(p.id, e.currentTarget)}><Photo src={p.thumbnail} alt={p.title} category={category} /></button>
      <div className="product-body">
        <div className="product-top"><small>{category}</small><StockLabel out={out} /></div>
        <h3><button type="button" className="product-name" onClick={(e) => onOpen(p.id, e.currentTarget)}>{p.title}</button></h3>
        {pack && <p className="product-pack">{pack}</p>}
        <div className="product-bottom">
          <b>{price != null ? money(price) : "Ask"}</b>
          {price != null && !out && <Qty variantId={v.id} title={p.title} />}
        </div>
      </div>
    </article>
  )
}

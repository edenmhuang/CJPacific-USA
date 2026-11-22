"use client"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { api, token } from "@/lib/api"
import type { Cart, Customer } from "@/lib/types"

const CART = "cj_cart"
const CART_FIELDS = "id,customer_id,item_total,total,*items"
/** A product the visitor tried to save before signing in; saved right after they sign in. */
export const PENDING_FAVORITE = "cj_pending_favorite"

type Store = {
  ready: boolean; regionId: string | null; customer: Customer | null; cart: Cart | null; busy: boolean
  query: string; setQuery: (q: string) => void; count: number
  signIn: (email: string, password: string) => Promise<void>
  setSession: (t: string) => Promise<void>
  signOut: () => void
  refreshCustomer: () => Promise<void>
  setQuantity: (variantId: string, quantity: number) => Promise<void>
  addMany: (lines: { variant_id: string; quantity: number }[]) => Promise<number>
  forgetCart: () => void
  quantityOf: (variantId: string) => number
  whenIdle: () => Promise<unknown>
  favorites: string[]
  toggleFavorite: (productId: string) => Promise<void>
}
const Ctx = createContext<Store | null>(null)
export const useStore = () => useContext(Ctx)!

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [regionId, setRegion] = useState<string | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [cart, setCartState] = useState<Cart | null>(null)
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState("")
  const [favorites, setFavoritesState] = useState<string[]>([])
  const favRef = useRef<string[]>([])
  const setFavorites = useCallback((f: string[]) => { favRef.current = f; setFavoritesState(f) }, [])
  // Quantities the customer just tapped, shown at once while the cart request runs.
  const [pending, setPending] = useState<Record<string, number>>({})
  const cartRef = useRef<Cart | null>(null)
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const setCart = useCallback((c: Cart | null) => { cartRef.current = c; setCartState(c) }, [])
  /** Cart changes run one at a time so quick taps never create duplicate lines. */
  const enqueue = useCallback(<T,>(job: () => Promise<T>) => {
    const next = queue.current.then(job, job)
    queue.current = next.catch(() => undefined)
    return next
  }, [])

  const loadCustomer = useCallback(async () => {
    if (!token.get()) return setCustomer(null)
    try {
      const { customer } = await api<{ customer: Customer }>("/store/customers/me?fields=*addresses")
      setCustomer(customer)
    } catch {
      token.set(null); setCustomer(null); setFavorites([])
      return
    }
    try {
      const { favorites } = await api<{ favorites: string[] }>("/store/cj/favorites")
      setFavorites(favorites)
    } catch { /* favorites stay as they were */ }
  }, [])

  const loadCart = useCallback(async () => {
    const id = localStorage.getItem(CART)
    if (!id) return setCart(null)
    try {
      const { cart } = await api<{ cart: Cart & { completed_at?: string } }>(`/store/carts/${id}?fields=${CART_FIELDS},completed_at`)
      if (cart.completed_at) { localStorage.removeItem(CART); return setCart(null) }
      setCart(cart)
    } catch {
      localStorage.removeItem(CART); setCart(null)
    }
  }, [setCart])

  useEffect(() => {
    ;(async () => {
      try {
        const { regions } = await api<{ regions: { id: string }[] }>("/store/regions", { auth: null })
        setRegion(regions[0]?.id ?? null)
      } catch { /* backend down: catalog shows an error */ }
      await Promise.all([loadCustomer(), loadCart()])
      setReady(true)
    })()
  }, [loadCustomer, loadCart])

  const ensureCart = useCallback(async () => {
    if (cartRef.current) return cartRef.current.id
    const { cart: created } = await api<{ cart: Cart }>(`/store/carts?fields=${CART_FIELDS}`, { method: "POST", body: { region_id: regionId } })
    localStorage.setItem(CART, created.id)
    setCart(created)
    return created.id
  }, [regionId, setCart])

  /** Attach a guest cart to the business that just signed in. */
  const claimCart = useCallback(async () => {
    const id = localStorage.getItem(CART)
    if (!id) return
    try {
      const { cart } = await api<{ cart: Cart }>(`/store/carts/${id}/customer?fields=${CART_FIELDS}`, { method: "POST" })
      setCart(cart)
    } catch {
      localStorage.removeItem(CART); setCart(null)
    }
  }, [setCart])

  const setSession = useCallback(async (t: string) => {
    token.set(t)
    await loadCustomer()
    await claimCart()
    const pendingFavorite = sessionStorage.getItem(PENDING_FAVORITE)
    sessionStorage.removeItem(PENDING_FAVORITE)
    if (pendingFavorite) {
      try {
        const { favorites } = await api<{ favorites: string[] }>("/store/cj/favorites", { method: "POST", body: { product_id: pendingFavorite, favorite: true } })
        setFavorites(favorites)
      } catch { /* product no longer sold */ }
    }
  }, [loadCustomer, claimCart])

  const signIn = useCallback(async (email: string, password: string) => {
    const { token: t } = await api<{ token: string }>("/auth/customer/emailpass", { method: "POST", body: { email, password }, auth: null })
    await setSession(t)
  }, [setSession])

  const signOut = useCallback(() => {
    token.set(null); localStorage.removeItem(CART); setCustomer(null); setCart(null); setPending({}); setFavorites([])
  }, [setCart])

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    const q = Math.max(0, Math.min(999, quantity))
    setPending((p) => ({ ...p, [variantId]: q }))
    return enqueue(async () => {
      try {
        const id = await ensureCart()
        const line = cartRef.current?.items.find((i) => i.variant_id === variantId)
        let res: { cart?: Cart; parent?: Cart } | null = null
        if (!line && q > 0) res = await api(`/store/carts/${id}/line-items?fields=${CART_FIELDS}`, { method: "POST", body: { variant_id: variantId, quantity: q } })
        else if (line && q > 0 && line.quantity !== q) res = await api(`/store/carts/${id}/line-items/${line.id}?fields=${CART_FIELDS}`, { method: "POST", body: { quantity: q } })
        else if (line && q === 0) res = await api(`/store/carts/${id}/line-items/${line.id}?fields=${CART_FIELDS}`, { method: "DELETE" })
        const next = res && (res.cart || res.parent)
        if (next) setCart(next)
      } catch { /* the real quantity shows again below */ }
      finally {
        setPending((p) => { if (p[variantId] !== q) return p; const n = { ...p }; delete n[variantId]; return n })
      }
    })
  }, [enqueue, ensureCart, setCart])

  const addMany = useCallback((lines: { variant_id: string; quantity: number }[]) => enqueue(async () => {
    setBusy(true)
    let added = 0
    try {
      const id = await ensureCart()
      for (const l of lines) {
        const existing = cartRef.current?.items.find((i) => i.variant_id === l.variant_id)
        try {
          const res: { cart: Cart } = existing
            ? await api(`/store/carts/${id}/line-items/${existing.id}?fields=${CART_FIELDS}`, { method: "POST", body: { quantity: Math.min(999, existing.quantity + l.quantity) } })
            : await api(`/store/carts/${id}/line-items?fields=${CART_FIELDS}`, { method: "POST", body: l })
          setCart(res.cart); added++
        } catch { /* product no longer sold: skipped */ }
      }
    } finally {
      setBusy(false)
    }
    return added
  }), [enqueue, ensureCart, setCart])

  /** Saves or unsaves a product right away, then keeps the server's list (reverts if the request fails). */
  const toggleFavorite = useCallback(async (productId: string) => {
    const before = favRef.current
    const saving = !before.includes(productId)
    setFavorites(saving ? [productId, ...before] : before.filter((x) => x !== productId))
    try {
      const { favorites } = await api<{ favorites: string[] }>("/store/cj/favorites", { method: "POST", body: { product_id: productId, favorite: saving } })
      setFavorites(favorites)
    } catch {
      setFavorites(before)
    }
  }, [setFavorites])

  const quantityOf = useCallback((v: string) => pending[v] ?? cart?.items.find((i) => i.variant_id === v)?.quantity ?? 0, [pending, cart])
  const count = useMemo(() => {
    const ids = new Set([...(cart?.items.map((i) => i.variant_id) ?? []), ...Object.keys(pending)])
    let n = 0
    ids.forEach((v) => { n += quantityOf(v) })
    return n
  }, [cart, pending, quantityOf])

  const value = useMemo<Store>(() => ({
    ready, regionId, customer, cart, busy, query, setQuery, count, signIn, setSession, signOut, setQuantity, addMany, quantityOf,
    refreshCustomer: loadCustomer,
    whenIdle: () => queue.current,
    forgetCart: () => { localStorage.removeItem(CART); setCart(null); setPending({}) },
    favorites, toggleFavorite,
  }), [ready, regionId, customer, cart, busy, query, count, signIn, setSession, signOut, setQuantity, addMany, quantityOf, loadCustomer, setCart, favorites, toggleFavorite])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

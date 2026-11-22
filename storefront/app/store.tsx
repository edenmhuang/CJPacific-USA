"use client"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { api, token } from "@/lib/api"
import type { Cart, Customer } from "@/lib/types"

const CART = "cj_cart"
const CART_FIELDS = "id,customer_id,item_total,total,*items"

type Store = {
  ready: boolean; regionId: string | null; customer: Customer | null; cart: Cart | null; busy: boolean
  signIn: (email: string, password: string) => Promise<void>
  setSession: (t: string) => Promise<void>
  signOut: () => void
  refreshCustomer: () => Promise<void>
  setQuantity: (variantId: string, quantity: number) => Promise<void>
  addMany: (lines: { variant_id: string; quantity: number }[]) => Promise<number>
  forgetCart: () => void
  quantityOf: (variantId: string) => number
}
const Ctx = createContext<Store | null>(null)
export const useStore = () => useContext(Ctx)!

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [regionId, setRegion] = useState<string | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [cart, setCart] = useState<Cart | null>(null)
  const [busy, setBusy] = useState(false)

  const loadCustomer = useCallback(async () => {
    if (!token.get()) return setCustomer(null)
    try {
      const { customer } = await api<{ customer: Customer }>("/store/customers/me?fields=*addresses")
      setCustomer(customer)
    } catch {
      token.set(null); setCustomer(null)
    }
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
  }, [])

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
    if (cart) return cart.id
    const { cart: created } = await api<{ cart: Cart }>(`/store/carts?fields=${CART_FIELDS}`, { method: "POST", body: { region_id: regionId } })
    localStorage.setItem(CART, created.id)
    setCart(created)
    return created.id
  }, [cart, regionId])

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
  }, [])

  const setSession = useCallback(async (t: string) => {
    token.set(t)
    await loadCustomer()
    await claimCart()
  }, [loadCustomer, claimCart])

  const signIn = useCallback(async (email: string, password: string) => {
    const { token: t } = await api<{ token: string }>("/auth/customer/emailpass", { method: "POST", body: { email, password }, auth: null })
    await setSession(t)
  }, [setSession])

  const signOut = useCallback(() => {
    token.set(null); localStorage.removeItem(CART); setCustomer(null); setCart(null)
  }, [])

  const setQuantity = useCallback(async (variantId: string, quantity: number) => {
    setBusy(true)
    try {
      const id = await ensureCart()
      const line = cart?.items.find((i) => i.variant_id === variantId)
      const q = Math.max(0, Math.min(999, quantity))
      let res: { cart?: Cart; parent?: Cart }
      if (!line && q > 0) res = await api(`/store/carts/${id}/line-items?fields=${CART_FIELDS}`, { method: "POST", body: { variant_id: variantId, quantity: q } })
      else if (line && q > 0) res = await api(`/store/carts/${id}/line-items/${line.id}?fields=${CART_FIELDS}`, { method: "POST", body: { quantity: q } })
      else if (line) res = await api(`/store/carts/${id}/line-items/${line.id}?fields=${CART_FIELDS}`, { method: "DELETE" })
      else return
      setCart((res.cart || res.parent)!)
    } finally {
      setBusy(false)
    }
  }, [cart, ensureCart])

  const addMany = useCallback(async (lines: { variant_id: string; quantity: number }[]) => {
    setBusy(true)
    let added = 0
    try {
      const id = await ensureCart()
      let current = cart
      for (const l of lines) {
        const existing = current?.items.find((i) => i.variant_id === l.variant_id)
        try {
          const res: { cart: Cart } = existing
            ? await api(`/store/carts/${id}/line-items/${existing.id}?fields=${CART_FIELDS}`, { method: "POST", body: { quantity: Math.min(999, existing.quantity + l.quantity) } })
            : await api(`/store/carts/${id}/line-items?fields=${CART_FIELDS}`, { method: "POST", body: l })
          current = res.cart; added++
        } catch { /* product no longer sold: skipped */ }
      }
      if (current) setCart(current)
    } finally {
      setBusy(false)
    }
    return added
  }, [cart, ensureCart])

  const value = useMemo<Store>(() => ({
    ready, regionId, customer, cart, busy, signIn, setSession, signOut, setQuantity, addMany,
    refreshCustomer: loadCustomer,
    forgetCart: () => { localStorage.removeItem(CART); setCart(null) },
    quantityOf: (v) => cart?.items.find((i) => i.variant_id === v)?.quantity ?? 0,
  }), [ready, regionId, customer, cart, busy, signIn, setSession, signOut, setQuantity, addMany, loadCustomer])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

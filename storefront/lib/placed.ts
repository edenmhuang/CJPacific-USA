import type { Order } from "./types"

/** Orders just placed in this tab, so the confirmation page can open fully drawn instead of loading. */
const placed = new Map<string, Order>()
export const rememberPlaced = (o: Order) => { placed.set(o.id, o) }
export const takePlaced = (id: string) => { const o = placed.get(id) ?? null; placed.delete(id); return o }

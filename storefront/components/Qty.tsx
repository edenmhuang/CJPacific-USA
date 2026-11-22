"use client"
import { useStore } from "@/app/store"
import { Icon } from "./Icon"

/** One control for add and quantity: "+" slides open into "− n +" so the card never shifts. */
export function Qty({ variantId, title }: { variantId: string; title: string }) {
  const { quantityOf, setQuantity } = useStore()
  const q = quantityOf(variantId)
  return (
    <div className={`qty${q ? " on" : ""}`} role="group" aria-label={`Quantity of ${title}`}>
      <button type="button" className="qminus" tabIndex={q ? 0 : -1} aria-hidden={!q} aria-label={`Remove one ${title}`} onClick={() => setQuantity(variantId, q - 1)}><Icon n="minus" size={16} /></button>
      <span className="qcount" aria-live="polite">{q > 0 && <span key={q} className="qnum">{q}</span>}</span>
      <button type="button" className="qplus" aria-label={`${q ? "Add one more" : "Add"} ${title}`} onClick={() => setQuantity(variantId, q + 1)}><Icon n="plus" size={17} /></button>
    </div>
  )
}

"use client"
import { useEffect, useState } from "react"
import { useStore } from "@/app/store"
import { Icon } from "./Icon"

/** Quantity box between − and +: click to type an amount; Enter or click away to confirm, Escape to undo, 0 removes. */
function QtyInput({ q, title, onSet }: { q: number; title: string; onSet: (n: number) => void }) {
  const [draft, setDraft] = useState(String(q))
  const [editing, setEditing] = useState(false)
  useEffect(() => { if (!editing) setDraft(String(q)) }, [q, editing])
  const commit = () => {
    setEditing(false)
    if (draft === "") return setDraft(String(q))
    onSet(parseInt(draft, 10))
  }
  return (
    <input className="qinput" type="text" inputMode="numeric" enterKeyHint="done" autoComplete="off" aria-label={`Quantity of ${title}`} value={draft}
      onFocus={(e) => { setEditing(true); e.currentTarget.select() }}
      onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 3); setDraft(v); if (v !== "" && +v > 0) onSet(+v) }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur() }
        else if (e.key === "Escape") { setDraft(String(q)); setEditing(false); e.currentTarget.blur() }
      }} />
  )
}

/** One control for add and quantity: "+" slides open into "− n +" so the card never shifts. */
export function Qty({ variantId, title, onRemove }: { variantId: string; title: string; onRemove?: () => void }) {
  const { quantityOf, setQuantity } = useStore()
  const q = quantityOf(variantId)
  return (
    <div className={`qty${q ? " on" : ""}`} role="group" aria-label={`Quantity of ${title}`}>
      <button type="button" className="qminus" tabIndex={q ? 0 : -1} aria-hidden={!q} aria-label={`Remove one ${title}`} onClick={() => (q <= 1 && onRemove ? onRemove() : setQuantity(variantId, q - 1))}><Icon n="minus" size={16} /></button>
      <span className="qcount">{q > 0 && <QtyInput q={q} title={title} onSet={(n) => (n <= 0 && onRemove ? onRemove() : setQuantity(variantId, n))} />}</span>
      <button type="button" className="qplus" aria-label={`${q ? "Add one more" : "Add"} ${title}`} onClick={() => setQuantity(variantId, q + 1)}><Icon n="plus" size={17} /></button>
    </div>
  )
}

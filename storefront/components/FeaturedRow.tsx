"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { Icon } from "./Icon"

/** Horizontally scrolling row of featured products with previous / next buttons. */
export function FeaturedRow({ title, children }: { title: string; children: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ start: true, end: true })
  const measure = useCallback(() => {
    const el = track.current
    if (!el) return
    // Cards take the same width as the catalog grid below (same minimum width and gap).
    const cs = getComputedStyle(el)
    const min = parseFloat(cs.getPropertyValue("--fmin")) || 210, gap = parseFloat(cs.columnGap) || 15
    const w = el.clientWidth - 4, cols = Math.max(1, Math.floor((w + gap) / (min + gap)))
    el.style.setProperty("--fw", `${(w - gap * (cols - 1)) / cols}px`)
    setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 })
  }, [])
  useEffect(() => {
    const el = track.current
    if (!el) return
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    el.addEventListener("scroll", measure, { passive: true })
    return () => { ro.disconnect(); el.removeEventListener("scroll", measure) }
  }, [measure, children])
  const move = (dir: number) => {
    const el = track.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })
  }
  const scrolls = !(edge.start && edge.end)
  return (
    <section className="featured" aria-label={title}>
      <div className="featurehead">
        <h3>{title}</h3>
        {scrolls && (
          <div className="featurenav">
            <button type="button" aria-label="Previous featured products" disabled={edge.start} onClick={() => move(-1)}><Icon n="back" size={18} /></button>
            <button type="button" aria-label="Next featured products" disabled={edge.end} onClick={() => move(1)}><Icon n="next" size={18} /></button>
          </div>
        )}
      </div>
      <div className="featuretrack" ref={track}>{children}</div>
    </section>
  )
}

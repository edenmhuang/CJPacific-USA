"use client"
import { useState } from "react"
import { Icon } from "./Icon"

export function Photo({ src, alt, category }: { src?: string | null; alt: string; category?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="cj-photo">
      {src && !failed && (
        <img src={src} alt={alt} loading="lazy"
          ref={(el) => { if (el?.complete && el.naturalWidth) el.classList.add("loaded") }}
          onLoad={(e) => e.currentTarget.classList.add("loaded")} onError={() => setFailed(true)} />
      )}
      <span aria-hidden="true"><Icon n={category || "all"} size={35} /></span>
    </div>
  )
}

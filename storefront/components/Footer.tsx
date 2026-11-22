"use client"
import { usePathname } from "next/navigation"
import { COPYRIGHT } from "@/lib/format"

/** One shared footer. Pinned to the bottom of the window on every page except the catalog, where it sits in the product column beside the fixed sidebar. */
export function Footer({ inShelf = false }: { inShelf?: boolean }) {
  const path = usePathname()
  if (path === "/" && !inShelf) return null // the catalog renders its footer beside the category sidebar
  const pinned = path !== "/"
  return <footer className={"cj-footer" + (pinned ? " pinned" : "")}><span>{COPYRIGHT}</span></footer>
}

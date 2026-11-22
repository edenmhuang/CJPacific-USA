"use client"
import { useRouter } from "next/navigation"
import { PENDING_FAVORITE, useStore } from "@/app/store"
import { Icon } from "./Icon"

/** Heart toggle. Saving needs an account: signed-out visitors go to sign in, and the product is saved once they do. */
export function FavButton({ id, title }: { id: string; title: string }) {
  const { customer, favorites, toggleFavorite } = useStore()
  const router = useRouter()
  const on = !!customer && favorites.includes(id)
  const label = !customer ? `Sign in to save ${title}` : on ? `Remove ${title} from favorites` : `Save ${title} to favorites`
  return (
    <button type="button" className={"fav" + (on ? " on" : "")} aria-pressed={on} aria-label={label} title={!customer ? "Sign in to save favorites" : on ? "Saved" : "Save"}
      onClick={(e) => {
        e.stopPropagation()
        if (!customer) { sessionStorage.setItem(PENDING_FAVORITE, id); router.push("/account?reason=favorites"); return }
        toggleFavorite(id)
      }}>
      <Icon n="heart" size={18} fill={on} />
    </button>
  )
}

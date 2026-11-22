"use client"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { api } from "@/lib/api"
import { useStore } from "../store"

export default function ResetPage() {
  return <Suspense><Reset /></Suspense>
}

function Reset() {
  const params = useSearchParams()
  const router = useRouter()
  const { signIn } = useStore()
  const [password, setPassword] = useState("")
  const [err, setErr] = useState("")
  const [busy, setBusy] = useState(false)
  const t = params.get("token") || ""
  const email = params.get("email") || ""

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("")
    try {
      await api("/auth/customer/emailpass/update", { method: "POST", auth: t, body: { email, password } })
      await signIn(email, password)
      router.push("/")
    } catch (e) {
      setErr((e as Error).message.includes("Unauthorized") || (e as Error).message.includes("sign in") ? "This link has expired. Request a new one from Sign in." : (e as Error).message)
      setBusy(false)
    }
  }

  if (!t || !email) return <div className="narrow panel"><h1>Reset link is incomplete</h1><p className="dim">Use the link from your email.</p></div>
  return (
    <form className="narrow panel fields" onSubmit={submit}>
      <h1>New password</h1>
      <p className="dim">{email}</p>
      <label>Password<input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></label>
      {err && <p className="notice">{err}</p>}
      <button className="primary block" disabled={busy}>{busy ? "Saving…" : "Save and sign in"}</button>
    </form>
  )
}

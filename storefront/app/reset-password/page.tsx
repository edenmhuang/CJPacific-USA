"use client"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { api } from "@/lib/api"
import { useStore } from "../store"
import { Req, Page } from "@/components/Page"

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
      const m = (e as Error).message
      setErr(m.includes("Unauthorized") || m.includes("sign in") ? "This link has expired. Request a new one from Sign in." : m)
      setBusy(false)
    }
  }

  return (
    <Page>
      <div className="authwrap">
        {!t || !email ? (
          <div className="surface auth"><h2>Reset link is incomplete</h2><p className="dim">Use the link from your email.</p></div>
        ) : (
          <form className="surface auth" onSubmit={submit}>
            <h2>New password</h2>
            <p className="dim">{email}</p>
            <label>Password<Req /><input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></label>
            {err && <p className="autherr" role="alert">{err}</p>}
            <button className="primary wide" disabled={busy}>{busy ? "Saving…" : "Save and sign in"}</button>
          </form>
        )}
      </div>
    </Page>
  )
}

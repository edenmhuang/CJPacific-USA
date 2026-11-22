"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useStore } from "../store"
import { Page, Title } from "@/components/Page"
import { api } from "@/lib/api"

export default function VerifyEmailPage() {
  const { customer, ready } = useStore()
  const [proof, setProof] = useState("")
  const [verified, setVerified] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  useEffect(() => {
    const incoming = new URLSearchParams(window.location.hash.slice(1)).get("token")
    try {
      if (incoming) sessionStorage.setItem("cj_email_link", incoming)
      setProof(incoming ?? sessionStorage.getItem("cj_email_link") ?? "")
    } catch { setProof(incoming ?? "") }
    if (incoming) window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search)
  }, [])
  useEffect(() => {
    let live = true
    if (customer) api<{ verified: boolean }>("/store/cj/email-verification").then(d => { if (live) setVerified(d.verified) }).catch(() => {})
    return () => { live = false }
  }, [customer?.id])

  async function act(confirm: boolean) {
    setBusy(true); setError(""); setNotice("")
    try {
      const result = await api<{ verified: boolean; sent?: boolean }>("/store/cj/email-verification", { method: "POST", body: confirm ? { token: proof } : {} })
      if (result.verified) {
        setVerified(true); setProof("")
        try { sessionStorage.removeItem("cj_email_link") } catch { /* storage unavailable */ }
      } else setNotice(result.sent ? "Check your inbox or spam folder. To request another email, wait up to five minutes." : "A preview was created. No email was sent in this test environment.")
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }

  return <Page><div className="authwrap"><section className="surface auth">
    <Title eyebrow="YOUR BUSINESS" name={verified ? "Email verified" : "Verify your email"} />
    {ready && (verified ? <><p>You can now place pickup and delivery orders.</p><Link className="primary wide" href="/cart">Go to cart</Link></>
      : !customer ? <><p>Sign in with the business account that requested this link.</p><Link className="primary wide" href="/account?next=/verify-email">Sign in</Link></>
      : <><p>Confirm <strong>{customer.email}</strong> before placing an order.</p>
        {error && <p className="notice" role="alert">{error}</p>}{notice && <p className="okmsg" role="status">{notice}</p>}
        {proof && <button type="button" className="primary wide" disabled={busy} onClick={() => act(true)}>Confirm email</button>}
        <button type="button" className={(proof ? "secondary" : "primary") + " wide"} disabled={busy} onClick={() => act(false)}>{busy ? "Please wait…" : proof ? "Request a new link" : "Send verification email"}</button>
        <Link className="textbtn" href="/account">Back to account</Link></>)}
  </section></div></Page>
}

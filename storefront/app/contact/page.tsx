"use client"
import { useState } from "react"
import { ABOUT, CONTACT_EMAIL, CONTACT_PHONE, STORE_ADDRESS } from "@/lib/format"
import { Icon } from "@/components/Icon"
import { Req, Page, Title } from "@/components/Page"

export default function Contact() {
  const [msg, setMsg] = useState({ name: "", email: "", text: "" })
  const [sent, setSent] = useState(false)
  const send = (e: React.FormEvent) => {
    e.preventDefault()
    const body = `${msg.text.trim()}\n\n${msg.name.trim()}\n${msg.email.trim()}`
    location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Message from " + msg.name.trim())}&body=${encodeURIComponent(body)}`
    setSent(true)
  }
  const tel = "+1" + CONTACT_PHONE.replace(/\D/g, "").slice(-10)
  return (
    <Page>
      <Title eyebrow="CJPACIFIC USA" name="Contact Us" />
      {sent && <div className="cj-feedback" role="status">Your email app opened with the message ready to send.<button type="button" onClick={() => setSent(false)} aria-label="Dismiss message">×</button></div>}
      <div className="contactgrid">
        <div className="contactstack">
          <section className="surface about"><h2>About Us</h2><p lang="zh-Hans">{ABOUT}</p></section>
          <form className="surface contactform" onSubmit={send}>
            <h2>Send a message</h2>
            <label>Name<Req /><input type="text" required autoComplete="name" value={msg.name} onChange={(e) => setMsg({ ...msg, name: e.target.value })} /></label>
            <label>Email<Req /><input type="email" required autoComplete="email" value={msg.email} onChange={(e) => setMsg({ ...msg, email: e.target.value })} /></label>
            <label className="grow"><span>Message<Req /></span><textarea rows={5} required value={msg.text} onChange={(e) => setMsg({ ...msg, text: e.target.value })} /></label>
            <div className="actions"><button className="primary" type="submit"><Icon n="mail" size={17} />Send message</button></div>
          </form>
        </div>
        <section className="surface contactinfo">
          <iframe title="CJ Pacific USA on the map" src={`https://maps.google.com/maps?q=${encodeURIComponent(STORE_ADDRESS)}&z=15&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
          <dl>
            <div><dt>Address</dt><dd><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STORE_ADDRESS)}`} target="_blank" rel="noopener noreferrer">14600 Doolittle Dr<br />San Leandro, CA 94577</a></dd></div>
            <div><dt>Hours</dt><dd>Mon–Fri<br />9am–5pm PT</dd></div>
            <div><dt>Phone</dt><dd><a href={`tel:${tel}`}>{CONTACT_PHONE}</a></dd></div>
            <div><dt>Email</dt><dd><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></dd></div>
          </dl>
        </section>
      </div>
    </Page>
  )
}

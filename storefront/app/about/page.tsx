import Link from "next/link"
import { ABOUT, CONTACT_EMAIL, CONTACT_PHONE, STORE_ADDRESS } from "@/lib/format"
import { Page, Title } from "@/components/Page"

export default function About() {
  const tel = "+1" + CONTACT_PHONE.replace(/\D/g, "").slice(-10)
  return (
    <Page>
      <Title eyebrow="CJPACIFIC USA" name="About Us" />
      <div className="orderlayout">
        <section className="surface about">
          <h2>Since 1983</h2>
          <p lang="zh-Hans">{ABOUT}</p>
          <div className="actions"><Link className="primary" href="/">Browse catalog</Link><Link className="secondary" href="/contact">Contact us</Link></div>
        </section>
        <section className="surface contactinfo">
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

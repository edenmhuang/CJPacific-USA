import { ABOUT } from "@/lib/format"
import { Page, Title } from "@/components/Page"

export default function About() {
  return (
    <Page>
      <Title eyebrow="CJPACIFIC USA" name="About Us" />
      <section className="surface about aboutonly">
        <h2>Since 1983</h2>
        <p lang="zh-Hans">{ABOUT}</p>
      </section>
    </Page>
  )
}

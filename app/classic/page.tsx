import type { Metadata } from "next";
import Link from "next/link";
import { ProjectArt, SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import { content } from "@/lib/content";

export const metadata: Metadata = {
  title: "Classic view",
  description: `${content.name} — ${content.role}. Selected work, experience and contact.`,
  alternates: { canonical: "/classic" },
};

export default function ClassicPage() {
  const email = content.email;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: content.name,
    jobTitle: content.role,
    url: content.siteUrl,
    email: `mailto:${email}`,
    sameAs: content.contacts.filter((c) => c.url.startsWith("http")).map((c) => c.url),
    knowsAbout: content.stack.flatMap((g) => g.items),
  };
  return (
    <div className="site">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />
      <main id="main" className="site-wrap">
        {/* ── Intro ─────────────────────────────── */}
        <section className="intro" aria-labelledby="intro-title">
          <p className="eyebrow">
            <span className="pulse-dot" aria-hidden /> {content.availability}
          </p>
          <h1 id="intro-title">
            {content.name}
            <span className="intro-role">{content.role}</span>
          </h1>
          <p className="intro-lead">{content.headline}</p>
          <div className="intro-actions">
            <Link href="#work" className="btn btn-primary">
              See selected work
            </Link>
            <a href={`mailto:${email}`} className="btn">
              {email}
            </a>
            {content.resumeUrl ? (
              <a href={content.resumeUrl} className="btn">
                Résumé (PDF)
              </a>
            ) : null}
          </div>
          <p className="intro-meta">{content.location}</p>
        </section>

        {/* ── Work ──────────────────────────────── */}
        <section id="work" className="block" aria-labelledby="work-title">
          <h2 id="work-title" className="block-title">
            <span aria-hidden>01</span> Selected work
          </h2>
          <ul className="work-grid">
            {content.projects.map((p) => (
              <li key={p.slug}>
                <Link href={p.url} className="work-card">
                  <ProjectArt colors={p.colors} title={p.title} />
                  <div className="work-card-body">
                    <p className="work-card-meta">
                      {p.kind} · {p.year}
                    </p>
                    <h3>{p.title}</h3>
                    <p>{p.description}</p>
                    <ul className="tags" aria-label="Stack">
                      {p.stack.slice(0, 4).map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── About ─────────────────────────────── */}
        <section id="about" className="block two-col" aria-labelledby="about-title">
          <h2 id="about-title" className="block-title">
            <span aria-hidden>02</span> About
          </h2>
          <div className="prose">
            {content.about.slice(0, 3).map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </section>

        {/* ── Experience ────────────────────────── */}
        <section className="block two-col" aria-labelledby="exp-title">
          <h2 id="exp-title" className="block-title">
            <span aria-hidden>03</span> Experience
          </h2>
          <ol className="timeline">
            {content.experience.map((e) => (
              <li key={e.period + e.company}>
                <p className="timeline-period">{e.period}</p>
                <div>
                  <h3>
                    {e.role} <span>· {e.company}</span>
                  </h3>
                  <p>{e.summary}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Stack ─────────────────────────────── */}
        <section className="block two-col" aria-labelledby="stack-title">
          <h2 id="stack-title" className="block-title">
            <span aria-hidden>04</span> Toolbox
          </h2>
          <div className="stack-grid">
            {content.stack.map((g) => (
              <div key={g.group}>
                <h3>{g.group}</h3>
                <ul>
                  {g.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── Contact ───────────────────────────── */}
        <section id="contact" className="block contact-block" aria-labelledby="contact-title">
          <h2 id="contact-title" className="contact-title">
            getInTouch<span aria-hidden>()</span>
          </h2>
          <p className="intro-lead">
            Have a role, a project or just a nice idea? My inbox is open — I usually reply within a day.
          </p>
          <div className="intro-actions">
            <a href={`mailto:${email}`} className="btn btn-primary">
              Say hello ↗
            </a>
            {content.contacts
              .filter((c) => !c.url.startsWith("mailto:"))
              .map((c) => (
                <a key={c.label} href={c.url} target="_blank" rel="noreferrer" className="btn">
                  {c.label}
                </a>
              ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

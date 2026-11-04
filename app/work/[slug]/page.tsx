import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectArt, SiteFooter, SiteHeader } from "@/components/site/SiteChrome";
import { content, getProject } from "@/lib/content";

export function generateStaticParams() {
  return content.projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) return {};
  return {
    title: `${p.title} — case study`,
    description: p.description,
    alternates: { canonical: `/work/${p.slug}` },
  };
}

export default async function CaseStudy({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) notFound();

  const i = content.projects.findIndex((x) => x.slug === p.slug);
  const next = content.projects[(i + 1) % content.projects.length];

  return (
    <div className="site">
      <SiteHeader />
      <main id="main" className="site-wrap case">
        <Link href="/classic#work" className="back-link">
          ← All work
        </Link>
        {p.sample ? (
          <p className="sample-note" role="note">
            Sample case study — replace it with a real project in <code>lib/content.ts</code>.
          </p>
        ) : null}
        <header className="case-head">
          <p className="eyebrow">
            {p.kind} · {p.year}
          </p>
          <h1>{p.title}</h1>
          <p className="intro-lead">{p.description}</p>
        </header>

        <ProjectArt colors={p.colors} title={p.title} />

        <dl className="case-facts">
          <div>
            <dt>Role</dt>
            <dd>{p.role}</dd>
          </div>
          <div>
            <dt>Year</dt>
            <dd>{p.year}</dd>
          </div>
          <div>
            <dt>Stack</dt>
            <dd>{p.stack.join(", ")}</dd>
          </div>
          {p.links.live || p.links.code ? (
            <div>
              <dt>Links</dt>
              <dd className="case-links">
                {p.links.live ? (
                  <a href={p.links.live} {...(p.links.live.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
                    Live ↗
                  </a>
                ) : null}
                {p.links.code ? (
                  <a href={p.links.code} target="_blank" rel="noreferrer">
                    Code ↗
                  </a>
                ) : null}
              </dd>
            </div>
          ) : null}
        </dl>

        <section className="case-section" aria-labelledby="challenge">
          <h2 id="challenge">The challenge</h2>
          <p>{p.challenge}</p>
        </section>
        <section className="case-section" aria-labelledby="approach">
          <h2 id="approach">Approach</h2>
          <ol className="case-steps">
            {p.approach.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ol>
        </section>
        <section className="case-section" aria-labelledby="outcome">
          <h2 id="outcome">Outcome</h2>
          <p>{p.outcome}</p>
          <ul className="metrics">
            {p.metrics.map((m) => (
              <li key={m.label}>
                <strong>{m.value}</strong>
                <span>{m.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <nav className="case-next" aria-label="Next project">
          <span>Next project</span>
          <Link href={next.url}>{next.title} →</Link>
        </nav>
      </main>
      <SiteFooter />
    </div>
  );
}

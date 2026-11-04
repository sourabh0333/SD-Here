import Link from "next/link";
import { content } from "@/lib/content";

/** Header for the classic (non-WebGL) pages. */
export function SiteHeader() {
  return (
    <header className="site-header">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="site-wrap site-header-row">
        <Link href="/classic" className="site-logo" aria-label={`${content.name} — home`}>
          <span aria-hidden>&lt;</span>
          {content.name}
          <span aria-hidden> /&gt;</span>
        </Link>
        <nav aria-label="Primary" className="site-nav">
          <Link href="/classic#work">Work</Link>
          <Link href="/classic#about">About</Link>
          <Link href="/colophon">How it&apos;s built</Link>
          <Link href="/classic#contact">Contact</Link>
          <Link href="/" className="site-nav-cta">
            Enter 3D ↗
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-wrap site-footer-row">
        <p>
          © {content.name} · Built with Next.js, React Three Fiber &amp; a lot of coffee.
        </p>
        <nav aria-label="Social">
          {content.contacts.map((c) => (
            <a key={c.label} href={c.url} {...(c.url.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
              {c.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}

/** Abstract artwork for a project (no screenshots needed). */
export function ProjectArt({ colors, title }: { colors: [string, string]; title: string }) {
  return (
    <div
      className="project-art"
      style={{ background: `radial-gradient(120% 90% at 20% 15%, ${colors[0]}, ${colors[1]})` }}
      aria-hidden
    >
      <div className="project-art-window">
        <span className="dots">
          <i />
          <i />
          <i />
        </span>
        <span className="project-art-url">{title.toLowerCase().replace(/\s+/g, "")}.app</span>
      </div>
      <div className="project-art-mock">
        <b />
        <span />
        <span />
        <span className="short" />
        <div className="project-art-grid">
          <i />
          <i />
          <i />
        </div>
      </div>
    </div>
  );
}

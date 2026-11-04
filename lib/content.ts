// ✏️  Edit everything personal about the portfolio here.
// Fields marked "TODO" are placeholders — replace them with your real details.

export type Project = {
  slug: string;
  title: string;
  kind: string;
  year: string;
  /** One-line pitch shown on cards. */
  description: string;
  /** Your role on the project. */
  role: string;
  stack: string[];
  /** Two accent colours for the card artwork. */
  colors: [string, string];
  /** Case study body. */
  challenge: string;
  approach: string[];
  outcome: string;
  metrics: { label: string; value: string }[];
  links: { live?: string; code?: string };
  /** true = example content that still needs replacing (shows a notice on the case study). */
  sample?: boolean;
  url: string;
};

const project = (p: Omit<Project, "url">): Project => ({ ...p, url: `/work/${p.slug}` });

export const content = {
  name: "Sourabh",
  role: "Frontend Developer",
  tagline: "Frontend Developer · Creative Web",
  headline: "I build interfaces that feel fast, look sharp and behave like they were made for the people using them.",
  location: "India · Remote", // TODO
  availability: "Open to frontend roles & freelance projects", // TODO
  email: "hello@example.com", // TODO: your real email
  siteUrl: "https://sd-here.vercel.app", // TODO: your production URL
  resumeUrl: "", // TODO: link to a PDF resume (optional)

  about: [
    "I'm Sourabh, a frontend developer who cares about the details you feel before you notice them: a 60 fps scroll, a focus ring in the right place, a page that loads before you blink.",
    "I work across the whole frontend: design systems, React and Next.js apps, motion and real-time 3D. I like turning fuzzy ideas into shipped, measurable product.",
    "This site is my playground — every building, cloud and shadow here is drawn by code. Press I at any time to open the inspector and see how it's made.",
    "Keep scrolling to discover the rest :)",
  ],

  /** Shown one by one during the scooter ride. */
  skills: [
    "React & Next.js",
    "TypeScript",
    "Design Systems",
    "Motion & Interaction",
    "WebGL · Three.js",
    "Performance & A11y",
  ],

  /** Grouped tech stack for the classic page. */
  stack: [
    { group: "Languages", items: ["TypeScript", "JavaScript", "HTML", "CSS / Sass", "GLSL"] },
    { group: "Frameworks", items: ["React", "Next.js", "React Three Fiber", "Node.js", "Tailwind CSS"] },
    { group: "Craft", items: ["Design systems", "Accessibility (WCAG 2.2)", "Core Web Vitals", "Animation (GSAP / Motion)", "Testing (Vitest / Playwright)"] },
    { group: "Tools", items: ["Figma", "Git & GitHub Actions", "Vercel", "Storybook", "Blender (basics)"] },
  ],

  /** TODO: replace with your real experience. */
  experience: [
    {
      period: "2024 — Now",
      role: "Frontend Developer",
      company: "Your Company",
      summary: "Lead the React/Next.js frontend of a SaaS product; built the design system and cut LCP by 40%.",
    },
    {
      period: "2022 — 2024",
      role: "Frontend Engineer",
      company: "Previous Company",
      summary: "Shipped customer-facing dashboards, interactive data viz and an accessible component library.",
    },
    {
      period: "2020 — 2022",
      role: "Web Developer",
      company: "Freelance",
      summary: "Designed and built marketing sites and e-commerce storefronts for small brands.",
    },
  ],

  /** TODO: replace with your real projects. Each gets its own case study page at /work/<slug>. */
  projects: [
    project({
      slug: "sd-here",
      title: "SD-Here",
      kind: "Portfolio · WebGL",
      year: "2026",
      description: "This very site — a scroll-driven 3D journey with an inspector mode.",
      role: "Design & development",
      stack: ["Next.js", "React Three Fiber", "GLSL", "TypeScript"],
      colors: ["#f2a7b5", "#5b3a5e"],
      challenge:
        "Build a cinematic 3D portfolio that still loads fast, works on phones and gives recruiters a two-click path to the facts.",
      approach: [
        "Generated every building, bridge and tree procedurally and merged them into a handful of draw calls.",
        "Drove the whole camera with one smoothed scroll value shared between WebGL and the DOM, so nothing re-renders React per frame.",
        "Shipped a classic, server-rendered version and case-study pages for accessibility, SEO and low-power devices.",
      ],
      outcome: "A memorable first impression that degrades gracefully, with a built-in inspector to show how it works.",
      metrics: [
        { label: "Models & textures", value: "~5 MB" },
        { label: "Scenes", value: "9" },
        { label: "Live stats", value: "press I" },
      ],
      links: { live: "/", code: "https://github.com/sourabh0333/SD-Here" },
    }),
    project({
      slug: "pulse",
      sample: true,
      title: "Pulse",
      kind: "SaaS Dashboard",
      year: "2025",
      description: "Real-time analytics dashboard with a component library shared across teams.",
      role: "Lead frontend",
      stack: ["React", "TypeScript", "TanStack Query", "Recharts"],
      colors: ["#9ec5e8", "#3c4a7a"],
      challenge: "Users waited seconds for dashboards with dozens of live widgets, and every team styled charts differently.",
      approach: [
        "Virtualised widget grids and streamed data over WebSockets with optimistic updates.",
        "Built a typed chart kit on top of the design system so every team shipped consistent visuals.",
      ],
      outcome: "Faster dashboards and a shared visual language across the product.",
      metrics: [
        { label: "Time to interactive", value: "−55%" },
        { label: "Shared components", value: "60+" },
      ],
      links: {},
    }),
    project({
      slug: "lumen",
      sample: true,
      title: "Lumen",
      kind: "Headless E-commerce",
      year: "2025",
      description: "Headless storefront with instant navigation and a custom CMS.",
      role: "Frontend developer",
      stack: ["Next.js", "Shopify Storefront API", "Tailwind CSS"],
      colors: ["#f7c98b", "#7a3f2c"],
      challenge: "A theme-based store was slow on mobile and hard for the content team to update.",
      approach: [
        "Moved to a headless Next.js storefront with static product pages and streaming cart.",
        "Gave editors a block-based CMS with live preview.",
      ],
      outcome: "Faster pages on mobile and a content team that ships without developers.",
      metrics: [
        { label: "Mobile LCP", value: "1.4 s" },
        { label: "Conversion", value: "+18%" },
      ],
      links: {},
    }),
    project({
      slug: "orbit-ui",
      sample: true,
      title: "Orbit UI",
      kind: "Design System",
      year: "2024",
      description: "Accessible component library and design tokens powering five products.",
      role: "Design system engineer",
      stack: ["React", "Radix UI", "Storybook", "Style Dictionary"],
      colors: ["#c7b6f2", "#40336b"],
      challenge: "Five products, five button styles, and accessibility bugs fixed five times.",
      approach: [
        "Defined tokens once in Figma and exported them to CSS variables with Style Dictionary.",
        "Built headless, keyboard-first components with visual regression tests in Storybook.",
      ],
      outcome: "One source of truth for UI and far fewer accessibility regressions.",
      metrics: [
        { label: "Products using it", value: "5" },
        { label: "A11y issues", value: "−70%" },
      ],
      links: {},
    }),
    project({
      slug: "atlas",
      sample: true,
      title: "Atlas",
      kind: "Data Visualisation",
      year: "2024",
      description: "Interactive maps and dashboards for real-time logistics data.",
      role: "Frontend & WebGL",
      stack: ["Mapbox GL", "deck.gl", "D3", "TypeScript"],
      colors: ["#9fe0c4", "#2c5a4f"],
      challenge: "Operators needed to see thousands of moving vehicles on a map without the browser freezing.",
      approach: [
        "Rendered fleets on the GPU with deck.gl layers and moved data processing into a Web Worker.",
        "Designed keyboard shortcuts and filters for power users.",
      ],
      outcome: "Smooth, real-time maps with tens of thousands of points.",
      metrics: [
        { label: "Points on screen", value: "50k" },
        { label: "Frame rate", value: "60 fps" },
      ],
      links: {},
    }),
    project({
      slug: "nova-studio",
      sample: true,
      title: "Nova Studio",
      kind: "Agency Website",
      year: "2023",
      description: "Award-style agency site with WebGL page transitions.",
      role: "Creative developer",
      stack: ["Astro", "GSAP", "Three.js"],
      colors: ["#f59a8c", "#5a2a36"],
      challenge: "The studio wanted a site as bold as its work without sacrificing load time.",
      approach: [
        "Used a single shared WebGL canvas for image distortion transitions between pages.",
        "Shipped zero JavaScript on text-only pages with Astro islands.",
      ],
      outcome: "A distinctive brand site that still scores well on Core Web Vitals.",
      metrics: [
        { label: "Lighthouse", value: "98" },
        { label: "Page weight", value: "< 400 KB" },
      ],
      links: {},
    }),
  ] satisfies Project[],

  contacts: [
    { label: "Email", glyph: "@", url: "mailto:hello@example.com" }, // TODO
    { label: "GitHub", glyph: "G", url: "https://github.com/sourabh0333" },
    { label: "LinkedIn", glyph: "in", url: "https://www.linkedin.com/" }, // TODO
  ],
};

export const getProject = (slug: string) => content.projects.find((p) => p.slug === slug);

import type { MetadataRoute } from "next";
import { content } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = content.siteUrl;
  return [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/classic`, priority: 0.9 },
    { url: `${base}/colophon`, priority: 0.6 },
    ...content.projects.filter((p) => !p.sample).map((p) => ({ url: `${base}${p.url}`, priority: 0.8 })),
  ];
}

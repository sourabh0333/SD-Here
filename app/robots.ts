import type { MetadataRoute } from "next";
import { content } from "@/lib/content";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${content.siteUrl}/sitemap.xml`,
  };
}

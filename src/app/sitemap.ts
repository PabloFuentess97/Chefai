import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://chefai.fit";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE}/pricing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE}/cookies`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Published blog posts
  let posts: { slug: string; updatedAt: Date }[] = [];
  try {
    posts = await prisma.blogPost.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { lte: now },
      },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
    });
  } catch {
    // BlogPost table may not exist yet on first deploy — degrade gracefully
  }

  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticEntries, ...postEntries];
}

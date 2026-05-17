"use server";

import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  generateBlogPostInput,
  upsertBlogPostSchema,
  upsertBlogCategorySchema,
} from "@/lib/validators";
import { generateBlogPostAi, type BlogPostAiOutput } from "@/lib/blog-ai";
import {
  processInlineImages,
  countInlineMarkers,
} from "@/lib/blog-inline-images";
import { generateImageBase64 } from "@/lib/ai/image";
import { IMAGE_PROMPT_PREFIX } from "@/lib/prompts";
import { getBranding } from "@/lib/branding";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/session";

function fail(code: string, message: string): ActionResult<never> {
  return { ok: false, error: { code, message } };
}

function fromZod(err: z.ZodError): ActionResult<never> {
  const first = err.issues[0];
  return fail("VALIDATION", first?.message ?? "Datos no válidos");
}

// ---------------------------------------------------------------
// Generate a complete draft with AI (text + image)
// ---------------------------------------------------------------
export async function generateBlogDraftAction(
  _prev: ActionResult<{ id: string; slug: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string; slug: string }>> {
  await requireAdmin();

  const parsed = generateBlogPostInput.safeParse({
    topic: formData.get("topic"),
    focusKeyword: formData.get("focusKeyword") || undefined,
    postType: formData.get("postType") || "listicle",
    targetAudience: formData.get("targetAudience") || undefined,
    categorySlug: formData.get("categorySlug") || undefined,
    generateImage: formData.get("generateImage") === "on",
  });
  if (!parsed.success) return fromZod(parsed.error);

  const branding = await getBranding();

  let ai: BlogPostAiOutput;
  try {
    ai = await generateBlogPostAi(
      {
        topic: parsed.data.topic,
        focusKeyword: parsed.data.focusKeyword,
        postType: parsed.data.postType,
        targetAudience: parsed.data.targetAudience,
      },
      branding.name
    );
  } catch (e) {
    logger.error({ err: e }, "blog ai generation failed");
    return fail(
      "AI_ERROR",
      "No hemos podido generar el post. Inténtalo de nuevo en un momento."
    );
  }

  // Ensure unique slug
  let slug = ai.slug;
  let attempt = 0;
  while (await prisma.blogPost.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${ai.slug}-${attempt}`;
    if (attempt > 9) break;
  }

  // Optional: resolve category by slug
  let categoryId: string | null = null;
  if (parsed.data.categorySlug) {
    const cat = await prisma.blogCategory.findUnique({
      where: { slug: parsed.data.categorySlug },
    });
    categoryId = cat?.id ?? null;
  }

  // Generate hero image AND inline images in parallel
  let heroImageUrl: string | null = null;
  let processedContent = ai.content;

  const generateHero = async () => {
    if (!parsed.data.generateImage) return null;
    try {
      const r = await generateImageBase64({
        prompt: `${IMAGE_PROMPT_PREFIX} ${ai.heroImagePrompt}`,
        quality: "standard",
      });
      const dir = path.resolve(process.cwd(), env.UPLOADS_DIR, "blog");
      await fs.mkdir(dir, { recursive: true });
      const filename = `${crypto.randomBytes(10).toString("hex")}.png`;
      await fs.writeFile(
        path.join(dir, filename),
        Buffer.from(r.b64, "base64")
      );
      return `/uploads/blog/${filename}`;
    } catch (e) {
      logger.warn({ err: e }, "blog hero image generation failed");
      return null;
    }
  };

  const generateInline = async () => {
    if (!parsed.data.generateImage) return ai.content;
    const inlineCount = countInlineMarkers(ai.content);
    if (inlineCount === 0) return ai.content;
    logger.info({ inlineCount }, "blog: generating inline images");
    const { content, generated, failed } = await processInlineImages(
      ai.content,
      { concurrency: 3, quality: "standard" }
    );
    logger.info(
      { inlineCount, generated, failed },
      "blog: inline images done"
    );
    return content;
  };

  const [heroResult, contentResult] = await Promise.all([
    generateHero(),
    generateInline(),
  ]);
  heroImageUrl = heroResult;
  processedContent = contentResult;

  const created = await prisma.blogPost.create({
    data: {
      slug,
      title: ai.title,
      subtitle: ai.subtitle ?? null,
      excerpt: ai.excerpt,
      content: processedContent,
      heroImageUrl,
      heroImagePrompt: ai.heroImagePrompt,
      authorName: branding.name,
      metaTitle: ai.metaTitle,
      metaDescription: ai.metaDescription,
      focusKeyword: ai.focusKeyword,
      status: "DRAFT",
      categoryId,
      tags: ai.suggestedTags,
    },
  });

  revalidatePath("/admin/blog");
  return { ok: true, data: { id: created.id, slug: created.slug } };
}

// ---------------------------------------------------------------
// Upsert (manual edit from the admin)
// ---------------------------------------------------------------
export async function upsertBlogPostAction(
  _prev: ActionResult<{ id: string; slug: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string; slug: string }>> {
  await requireAdmin();

  const tagsRaw = formData.get("tags");
  const tags =
    typeof tagsRaw === "string"
      ? tagsRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const parsed = upsertBlogPostSchema.safeParse({
    id: formData.get("id") || undefined,
    slug: formData.get("slug"),
    title: formData.get("title"),
    subtitle: formData.get("subtitle") || undefined,
    excerpt: formData.get("excerpt") || undefined,
    content: formData.get("content"),
    heroImageUrl: formData.get("heroImageUrl") || undefined,
    authorName: formData.get("authorName") || undefined,
    metaTitle: formData.get("metaTitle") || undefined,
    metaDescription: formData.get("metaDescription") || undefined,
    focusKeyword: formData.get("focusKeyword") || undefined,
    ogImageUrl: formData.get("ogImageUrl") || undefined,
    status: formData.get("status") || "DRAFT",
    scheduledFor: formData.get("scheduledFor") || null,
    categoryId: formData.get("categoryId") || undefined,
    tags,
  });
  if (!parsed.success) return fromZod(parsed.error);

  const data = parsed.data;
  const writeData = {
    slug: data.slug,
    title: data.title,
    subtitle: data.subtitle ?? null,
    excerpt: data.excerpt ?? null,
    content: data.content,
    heroImageUrl: data.heroImageUrl ?? null,
    authorName: data.authorName ?? null,
    metaTitle: data.metaTitle ?? null,
    metaDescription: data.metaDescription ?? null,
    focusKeyword: data.focusKeyword ?? null,
    ogImageUrl: data.ogImageUrl ?? null,
    status: data.status,
    scheduledFor: data.scheduledFor,
    categoryId: data.categoryId || null,
    tags: data.tags,
    publishedAt:
      data.status === "PUBLISHED"
        ? new Date()
        : data.status === "DRAFT"
          ? null
          : undefined,
  };

  try {
    const saved = data.id
      ? await prisma.blogPost.update({
          where: { id: data.id },
          data: writeData,
        })
      : await prisma.blogPost.create({ data: writeData });

    revalidatePath("/admin/blog");
    revalidatePath(`/blog/${saved.slug}`);
    revalidatePath("/blog");
    revalidatePath("/sitemap.xml");
    return { ok: true, data: { id: saved.id, slug: saved.slug } };
  } catch (e) {
    const msg =
      e instanceof Error && e.message.includes("Unique constraint")
        ? "Ya existe un post con ese slug"
        : "No se pudo guardar el post";
    return fail("DB_ERROR", msg);
  }
}

// ---------------------------------------------------------------
// Re-generate just the hero image (uses heroImagePrompt)
// ---------------------------------------------------------------
export async function regenerateBlogImageAction(
  postId: string
): Promise<ActionResult<{ imageUrl: string }>> {
  await requireAdmin();
  const post = await prisma.blogPost.findUnique({ where: { id: postId } });
  if (!post) return fail("NOT_FOUND", "Post no encontrado");
  if (!post.heroImagePrompt)
    return fail(
      "NO_PROMPT",
      "El post no tiene heroImagePrompt — añade uno y vuelve a intentar"
    );

  try {
    const r = await generateImageBase64({
      prompt: `${IMAGE_PROMPT_PREFIX} ${post.heroImagePrompt}`,
      quality: "standard",
    });
    const dir = path.resolve(process.cwd(), env.UPLOADS_DIR, "blog");
    await fs.mkdir(dir, { recursive: true });
    const filename = `${crypto.randomBytes(10).toString("hex")}.png`;
    await fs.writeFile(path.join(dir, filename), Buffer.from(r.b64, "base64"));
    const imageUrl = `/uploads/blog/${filename}`;
    await prisma.blogPost.update({
      where: { id: post.id },
      data: { heroImageUrl: imageUrl },
    });
    revalidatePath(`/blog/${post.slug}`);
    revalidatePath("/admin/blog");
    return { ok: true, data: { imageUrl } };
  } catch (e) {
    logger.error({ err: e }, "regenerate image failed");
    return fail("AI_ERROR", "No se pudo generar la imagen");
  }
}

/**
 * Find every [IMAGE: ...] marker in the post's current content, generate the
 * images and replace markers with ![alt](url). Use it when the admin manually
 * added markers in the editor, or to re-run after a previous failure.
 */
export async function regenerateInlineImagesAction(
  postId: string
): Promise<
  ActionResult<{ generated: number; failed: number; pending: number }>
> {
  await requireAdmin();
  const post = await prisma.blogPost.findUnique({ where: { id: postId } });
  if (!post) return fail("NOT_FOUND", "Post no encontrado");

  const before = countInlineMarkers(post.content);
  if (before === 0)
    return fail(
      "NO_MARKERS",
      "El post no tiene marcadores [IMAGE: …]. Añade alguno en el editor o regenera el post."
    );

  try {
    const { content, generated, failed } = await processInlineImages(
      post.content,
      { concurrency: 3, quality: "standard" }
    );
    await prisma.blogPost.update({
      where: { id: post.id },
      data: { content },
    });
    revalidatePath(`/admin/blog/${post.id}`);
    revalidatePath(`/blog/${post.slug}`);
    return {
      ok: true,
      data: {
        generated,
        failed,
        pending: countInlineMarkers(content),
      },
    };
  } catch (e) {
    logger.error({ err: e, postId }, "regenerate inline images failed");
    return fail("AI_ERROR", "No se pudieron generar las imágenes inline");
  }
}

export async function deleteBlogPostAction(
  id: string
): Promise<ActionResult<{ deleted: true }>> {
  await requireAdmin();
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) return fail("NOT_FOUND", "Post no encontrado");
  await prisma.blogPost.delete({ where: { id } });
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  revalidatePath("/sitemap.xml");
  return { ok: true, data: { deleted: true } };
}

// ---------------------------------------------------------------
// Categories
// ---------------------------------------------------------------
export async function upsertBlogCategoryAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = upsertBlogCategorySchema.safeParse({
    id: formData.get("id") || undefined,
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    color: formData.get("color") || undefined,
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!parsed.success) return fromZod(parsed.error);
  const data = parsed.data;
  const writeData = {
    slug: data.slug,
    name: data.name,
    description: data.description ?? null,
    color: data.color,
    sortOrder: data.sortOrder,
  };
  try {
    const saved = data.id
      ? await prisma.blogCategory.update({
          where: { id: data.id },
          data: writeData,
        })
      : await prisma.blogCategory.create({ data: writeData });
    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    return { ok: true, data: { id: saved.id } };
  } catch (e) {
    const msg =
      e instanceof Error && e.message.includes("Unique constraint")
        ? "Ya existe una categoría con ese slug"
        : "No se pudo guardar la categoría";
    return fail("DB_ERROR", msg);
  }
}

export async function deleteBlogCategoryAction(
  id: string
): Promise<ActionResult<{ deleted: true }>> {
  await requireAdmin();
  await prisma.blogCategory.delete({ where: { id } });
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return { ok: true, data: { deleted: true } };
}

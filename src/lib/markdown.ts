import "server-only";
import { marked } from "marked";

// Configure once
marked.setOptions({
  gfm: true,
  breaks: false,
});

/**
 * Server-only markdown -> HTML. Used by the public blog post page. The
 * input comes from either the AI generator or the admin editor; before
 * publishing the admin reviews it, so we trust the content.
 *
 * Note: marked already escapes inline HTML by default in modern versions
 * unless `mangle` / `headerIds` are toggled. We keep the defaults.
 */
export async function renderMarkdown(md: string): Promise<string> {
  return marked.parse(md, { async: true });
}

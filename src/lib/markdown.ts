import "server-only";
import { marked, type Tokens } from "marked";

// Custom renderer: native lazy loading + decoding hint on images, target=_blank
// for external links. We never use `dangerouslySetInnerHTML` user content here
// — the input comes from the admin editor (trusted).
const renderer = new marked.Renderer();

renderer.image = function ({ href, title, text }: Tokens.Image): string {
  const safeHref = href ?? "";
  const alt = (text ?? "").replace(/"/g, "&quot;");
  const titleAttr = title ? ` title="${title.replace(/"/g, "&quot;")}"` : "";
  return `<img src="${safeHref}" alt="${alt}"${titleAttr} loading="lazy" decoding="async" />`;
};

renderer.link = function ({ href, title, tokens }: Tokens.Link): string {
  const text = this.parser.parseInline(tokens);
  const safeHref = href ?? "#";
  const isExternal =
    safeHref.startsWith("http://") || safeHref.startsWith("https://");
  const titleAttr = title ? ` title="${title.replace(/"/g, "&quot;")}"` : "";
  const externalAttr = isExternal
    ? ' target="_blank" rel="noopener noreferrer"'
    : "";
  return `<a href="${safeHref}"${titleAttr}${externalAttr}>${text}</a>`;
};

marked.setOptions({
  gfm: true,
  breaks: false,
  renderer,
});

/**
 * Server-only markdown -> HTML for blog posts. Input is authored by an
 * admin (trusted), so we don't sanitize. Custom renderer above adds lazy
 * loading on images and target=_blank on external links.
 */
export async function renderMarkdown(md: string): Promise<string> {
  return marked.parse(md, { async: true });
}

import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/** Collection descriptions are Markdown written by users: render, then strip anything unsafe. */
export function renderMarkdown(source: unknown) {
  const text = typeof source === "string" ? source : ((source as { content?: string } | undefined)?.content ?? "");
  if (!text.trim()) return "";
  const html = marked.parse(text, { async: false, gfm: true });
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2"]),
    allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, img: ["src", "alt", "title"] },
    allowedSchemes: ["http", "https", "mailto"],
  });
}

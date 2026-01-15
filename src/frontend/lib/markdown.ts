import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

// ==========================
// Configuration
// ==========================

marked.setOptions({ breaks: true, gfm: true });

const ALLOWED_TAGS = [
  "strong",
  "em",
  "s",
  "code",
  "a",
  "br", // Inline
  "p",
  "pre",
  "ul",
  "ol",
  "li",
  "blockquote", // Block
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "target", "rel"],
  code: ["class"],
};

// ==========================
// Renderer
// ==========================

/**
 * Renders markdown to sanitized HTML for chat messages.
 * Supports: bold, italic, strikethrough, code, code blocks, lists, blockquotes, links.
 * Links are opened in new tabs with security attributes.
 */
export const renderMarkdown = (content: string): string =>
  sanitizeHtml(marked.parse(content) as string, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" },
      }),
    },
  });

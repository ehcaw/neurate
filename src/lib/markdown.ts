import DOMPurify from "dompurify";
import { marked } from "marked";

// Configure marked options for better performance
marked.setOptions({
  gfm: true,
  breaks: true,
  smartLists: true,
  smartypants: true,
  async: false, // Synchronous rendering for better performance
  pedantic: false,
  silent: true, // Ignore errors
});

// Custom renderer to handle internal links
const renderer = new marked.Renderer();

renderer.link = (href, title, text) => {
  const isInternal = href?.startsWith("#");
  const target = isInternal ? "" : ' target="_blank" rel="noopener noreferrer"';
  const titleAttr = title ? ` title="${title}"` : "";

  return `<a href="${href}"${target}${titleAttr}>${text}</a>`;
};

// Process wiki-style links like [[Page Name]]
function processWikiLinks(html: string): string {
  return html.replace(/\[\[([^\]]+)\]\]/g, (match, pageName) => {
    return `<a href="#${encodeURIComponent(pageName)}" class="internal-link">${pageName}</a>`;
  });
}

// Cache for rendered markdown to improve performance
const markdownCache = new Map<string, string>();

export function markdownToHtml(markdown: string): string {
  // Check cache first
  if (markdownCache.has(markdown)) {
    return markdownCache.get(markdown) as string;
  }

  // Process wiki-style links
  const processedMarkdown = markdown.replace(
    /\[\[([^\]]+)\]\]/g,
    (match, pageName) => {
      return `[${pageName}](#${encodeURIComponent(pageName)})`;
    },
  );

  // Convert markdown to HTML
  let html = marked.parse(processedMarkdown, { renderer });

  // Sanitize HTML to prevent XSS
  html = DOMPurify.sanitize(html);

  // Cache the result
  markdownCache.set(markdown, html);

  return html;
}

// Clear cache when it gets too large
export function clearMarkdownCache() {
  if (markdownCache.size > 100) {
    markdownCache.clear();
  }
}

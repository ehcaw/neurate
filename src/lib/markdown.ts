import DOMPurify from "dompurify";
import { marked } from "marked";
import { parseLinks } from "./note-utils";

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true,
  //smartLists: true,
  //smartypants: true,
  //highlight: (code, lang) => {
  // You could add syntax highlighting here
  //return code;
});

// Custom renderer to handle internal links
const renderer = new marked.Renderer();

renderer.link = (href, title, text) => {
  const isInternal = href?.startsWith("#");
  const target = isInternal ? "" : ' target="_blank" rel="noopener noreferrer"';
  const titleAttr = title ? ` title="${title}"` : "";

  return `<a href="${href}"${target}${titleAttr}>${text}</a>`;
};

marked.use({ renderer });

// Process wiki-style links like [[Page Name]]
function processWikiLinks(html: string): string {
  return html.replace(/\[\[([^\]]+)\]\]/g, (match, pageName) => {
    return `<a href="#${encodeURIComponent(pageName)}" class="internal-link">${pageName}</a>`;
  });
}

export function markdownToHtml(markdown: string): string {
  // First, extract all wiki-style links
  const wikiLinks = parseLinks(markdown);

  // Replace wiki-style links with markdown links
  let processedMarkdown = markdown;
  wikiLinks.forEach((link) => {
    const pattern = new RegExp(`\\[\\[${link}\\]\\]`, "g");
    processedMarkdown = processedMarkdown.replace(
      pattern,
      `[${link}](#${encodeURIComponent(link)})`,
    );
  });

  // Convert markdown to HTML
  let html = marked(processedMarkdown);

  // Sanitize HTML to prevent XSS
  html = DOMPurify.sanitize(html);

  return html;
}

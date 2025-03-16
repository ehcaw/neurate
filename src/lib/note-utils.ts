import { nanoid } from "nanoid";

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export function createEmptyNote(title = "Untitled"): Note {
  const now = new Date().toISOString();
  return {
    id: nanoid(),
    title,
    content: "",
    createdAt: now,
    updatedAt: now,
    tags: [],
  };
}

export function extractTags(content: string): string[] {
  const tagRegex = /#([a-zA-Z0-9_-]+)/g;
  const matches = content.match(tagRegex);
  if (!matches) return [];

  return matches.map((tag) => tag.slice(1)); // Remove the # prefix
}

export function parseLinks(content: string): string[] {
  const linkRegex = /\[\[([^\]]+)\]\]/g;
  const matches = content.match(linkRegex);
  if (!matches) return [];

  return matches.map((link) => link.slice(2, -2)); // Remove the [[ and ]] delimiters
}

"use client";

import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import type { Note } from "@/lib/note-utils";
import { markdownToHtml, clearMarkdownCache } from "@/lib/markdown";

interface PreviewProps {
  note: Note;
  setIsPreviewMode: (isPreview: boolean) => void;
}

export function Preview({ note, setIsPreviewMode }: PreviewProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Memoize HTML content to prevent unnecessary re-renders
  const htmlContent = useMemo(() => {
    return markdownToHtml(note.content);
  }, [note.content]);

  // Set HTML content and add click handlers for internal links
  useEffect(() => {
    if (contentRef.current) {
      // Only update if content changed
      if (contentRef.current.innerHTML !== htmlContent) {
        contentRef.current.innerHTML = htmlContent;
      }

      // Add click handlers for internal links
      const links = contentRef.current.querySelectorAll('a[href^="#"]');
      links.forEach((link) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const href = link.getAttribute("href");
          if (href) {
            // Handle internal navigation here
            console.log("Navigate to:", href);
          }
        });
      });
    }

    return () => {
      if (contentRef.current) {
        const links = contentRef.current.querySelectorAll('a[href^="#"]');
        links.forEach((link) => {
          link.removeEventListener("click", () => {});
        });
      }
    };
  }, [htmlContent]);

  // Clear markdown cache when component unmounts
  useEffect(() => {
    return () => {
      clearMarkdownCache();
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <h1 className="text-lg font-medium truncate">
          {note.title || "Untitled"}
        </h1>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => setIsPreviewMode(false)}
        >
          <Edit className="h-4 w-4" />
          <span className="hidden sm:inline">Edit</span>
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div
          ref={contentRef}
          className="prose prose-sm max-w-none dark:prose-invert"
        />
      </div>
    </div>
  );
}

"use client";

import type React from "react";

import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import type { Note } from "@/lib/note-utils";
import { useDebounce } from "@/hooks/use-debounce";

interface EditorProps {
  note: Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  setIsPreviewMode: (isPreview: boolean) => void;
}

export function Editor({ note, updateNote, setIsPreviewMode }: EditorProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Set up debounced save to avoid excessive localStorage writes
  const debouncedSave = useDebounce((id: string, updates: Partial<Note>) => {
    updateNote(id, updates);
  }, 500);

  // Focus title input on initial render
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus();
    }
  }, [note.id]);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = contentRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [note.content]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      debouncedSave(note.id, { title: newTitle });
    },
    [note.id, debouncedSave],
  );

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      debouncedSave(note.id, { content: newContent });

      // Auto-resize textarea
      e.target.style.height = "auto";
      e.target.style.height = `${e.target.scrollHeight}px`;
    },
    [note.id, debouncedSave],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <input
          ref={titleRef}
          type="text"
          defaultValue={note.title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="flex-1 bg-transparent border-none outline-none text-lg font-medium"
        />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setIsPreviewMode(true)}
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Preview</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <textarea
          ref={contentRef}
          defaultValue={note.content}
          onChange={handleContentChange}
          placeholder="Start writing..."
          className="w-full h-full min-h-[calc(100vh-10rem)] resize-none bg-transparent border-none outline-none font-mono text-sm leading-relaxed"
          spellCheck="false"
        />
      </div>
    </div>
  );
}

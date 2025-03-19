"use client";

import type React from "react";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Bold,
  Italic,
  List,
  ListOrdered,
  Image,
  Link,
  Code,
} from "lucide-react";
import type { Note } from "@/lib/note-utils";

interface EnhancedEditorProps {
  note: Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  setIsPreviewMode: (isPreview: boolean) => void;
}

// A simpler, more performant editor implementation
export function EnhancedEditor({
  note,
  updateNote,
  setIsPreviewMode,
}: EnhancedEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState(note.content);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update local content when note changes
  useEffect(() => {
    setContent(note.content);
  }, [note.id, note.content]);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [content]);

  // Handle content change with debounced save
  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setContent(newContent);

      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set a new timeout for saving
      saveTimeoutRef.current = setTimeout(() => {
        updateNote(note.id, { content: newContent });
      }, 500);
    },
    [note.id, updateNote],
  );

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Insert formatting at cursor position
  const insertFormatting = useCallback(
    (format: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);

      let insertText = "";
      let cursorOffset = 0;

      switch (format) {
        case "bold":
          insertText = `**${selectedText}**`;
          cursorOffset = 2;
          break;
        case "italic":
          insertText = `*${selectedText}*`;
          cursorOffset = 1;
          break;
        case "list":
          insertText = `\n- ${selectedText}`;
          cursorOffset = 3;
          break;
        case "ordered-list":
          insertText = `\n1. ${selectedText}`;
          cursorOffset = 4;
          break;
        case "image":
          insertText = `![${selectedText || "alt text"}](url)`;
          cursorOffset = 2;
          break;
        case "link":
          insertText = `[${selectedText || "link text"}](url)`;
          cursorOffset = 1;
          break;
        case "code":
          insertText = selectedText.includes("\n")
            ? "```\n" + selectedText + "\n```"
            : "`" + selectedText + "`";
          cursorOffset = selectedText.includes("\n") ? 4 : 1;
          break;
      }

      const newContent =
        textarea.value.substring(0, start) +
        insertText +
        textarea.value.substring(end);

      // Update state
      setContent(newContent);

      // Update textarea value
      textarea.value = newContent;

      // Save the change
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        updateNote(note.id, { content: newContent });
      }, 500);

      // Set cursor position
      setTimeout(() => {
        textarea.focus();
        if (selectedText) {
          textarea.setSelectionRange(
            start + cursorOffset,
            start + cursorOffset + selectedText.length,
          );
        } else {
          const newPosition =
            start +
            cursorOffset +
            (format === "image" || format === "link" ? 8 : 0);
          textarea.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    },
    [note.id, updateNote],
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Check for keyboard shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "b":
            e.preventDefault();
            insertFormatting("bold");
            break;
          case "i":
            e.preventDefault();
            insertFormatting("italic");
            break;
          case "1":
            if (e.altKey) {
              e.preventDefault();
              insertFormatting("ordered-list");
            }
            break;
          case "-":
            e.preventDefault();
            insertFormatting("list");
            break;
          case "k":
            if (e.shiftKey) {
              e.preventDefault();
              insertFormatting("link");
            }
            break;
          case "`":
            e.preventDefault();
            insertFormatting("code");
            break;
        }
      }

      // Handle tab key for indentation
      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        // Insert tab character
        const newContent =
          textarea.value.substring(0, start) +
          "  " +
          textarea.value.substring(end);

        // Update state and textarea
        setContent(newContent);
        textarea.value = newContent;

        // Set cursor position after tab
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);

        // Save the change
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
          updateNote(note.id, { content: newContent });
        }, 500);
      }
    },
    [insertFormatting, note.id, updateNote],
  );

  return (
    <div className="flex flex-col h-full" data-editor>
      <div className="flex items-center justify-between p-2 border-b">
        <input
          type="text"
          value={note.title}
          onChange={(e) => updateNote(note.id, { title: e.target.value })}
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

      <div className="border-b p-1 flex items-center gap-1 bg-muted/30">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => insertFormatting("bold")}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => insertFormatting("italic")}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => insertFormatting("list")}
          title="Bullet List (Ctrl+-)"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => insertFormatting("ordered-list")}
          title="Numbered List (Alt+Ctrl+1)"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => insertFormatting("image")}
          title="Image"
        >
          <Image className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => insertFormatting("link")}
          title="Link (Ctrl+Shift+K)"
        >
          <Link className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => insertFormatting("code")}
          title="Code (Ctrl+`)"
        >
          <Code className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder="Start writing..."
          className="w-full h-full min-h-[calc(100vh-10rem)] resize-none bg-transparent border-none outline-none font-mono text-sm leading-relaxed"
          spellCheck="false"
          style={{
            caretColor: "var(--primary)",
            lineHeight: "1.6",
            tabSize: 2,
          }}
        />
      </div>
    </div>
  );
}

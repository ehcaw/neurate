"use client";

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
import { useDebounce } from "@/hooks/use-debounce";
import { basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
} from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { indentWithTab } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";

interface EnhancedEditorProps {
  note: Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  setIsPreviewMode: (isPreview: boolean) => void;
}

export function EnhancedEditor({
  note,
  updateNote,
  setIsPreviewMode,
}: EnhancedEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const noteIdRef = useRef(note.id);
  const noteContentRef = useRef(note.content);

  // Set up debounced save to avoid excessive localStorage writes
  const debouncedSave = useDebounce((id: string, content: string) => {
    updateNote(id, { content });
  }, 500);

  // Check for dark mode
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);

    // Listen for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          const isDark = document.documentElement.classList.contains("dark");
          setIsDarkMode(isDark);
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorRef.current || editorViewRef.current) return;

    const extensions = [
      basicSetup,
      lineNumbers(),
      highlightActiveLine(),
      keymap.of([indentWithTab]),
      markdown({
        base: markdownLanguage,
        codeLanguages: languages,
        addKeymap: true,
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const content = update.state.doc.toString();
          debouncedSave(note.id, content);
        }
      }),
      EditorView.theme({
        "&": {
          height: "100%",
          fontSize: "14px",
          fontFamily: "monospace",
        },
        ".cm-content": {
          fontFamily: "monospace",
          padding: "10px 0",
        },
        ".cm-line": {
          padding: "0 10px",
        },
      }),
    ];

    if (isDarkMode) {
      extensions.push(oneDark);
    }

    const state = EditorState.create({
      doc: note.content,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    editorViewRef.current = view;
    noteIdRef.current = note.id;
    noteContentRef.current = note.content;

    return () => {
      view.destroy();
      editorViewRef.current = null;
    };
  }, [debouncedSave, isDarkMode, note.content, note.id]);

  // Update editor content when note changes
  useEffect(() => {
    // Only update if the editor exists and either the note ID changed or content changed
    if (
      editorViewRef.current &&
      (noteIdRef.current !== note.id || noteContentRef.current !== note.content)
    ) {
      const currentContent = editorViewRef.current.state.doc.toString();

      // Only update if the content is actually different to avoid loops
      if (currentContent !== note.content) {
        editorViewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentContent.length,
            insert: note.content,
          },
        });
      }

      // Update refs
      noteIdRef.current = note.id;
      noteContentRef.current = note.content;
    }
  }, [note.id, note.content]);

  // Insert markdown formatting
  const insertFormatting = useCallback((format: string) => {
    if (!editorViewRef.current) return;

    const selection = editorViewRef.current.state.selection.main;
    const selectedText = editorViewRef.current.state.sliceDoc(
      selection.from,
      selection.to,
    );

    let insertText = "";
    let newCursorPos = selection.from;

    switch (format) {
      case "bold":
        insertText = `**${selectedText}**`;
        newCursorPos = selection.from + 2;
        break;
      case "italic":
        insertText = `*${selectedText}*`;
        newCursorPos = selection.from + 1;
        break;
      case "list":
        insertText = `\n- ${selectedText}`;
        newCursorPos = selection.from + 3;
        break;
      case "ordered-list":
        insertText = `\n1. ${selectedText}`;
        newCursorPos = selection.from + 4;
        break;
      case "image":
        insertText = `![${selectedText || "alt text"}](url)`;
        newCursorPos = selection.from + 2;
        break;
      case "link":
        insertText = `[${selectedText || "link text"}](url)`;
        newCursorPos = selection.from + 1;
        break;
      case "code":
        insertText = selectedText.includes("\n")
          ? "```\n" + selectedText + "\n```"
          : "`" + selectedText + "`";
        newCursorPos = selection.from + (selectedText.includes("\n") ? 4 : 1);
        break;
    }

    editorViewRef.current.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: insertText,
      },
      selection: {
        anchor:
          newCursorPos + (selectedText.length > 0 ? selectedText.length : 0),
      },
    });

    // Focus the editor after inserting
    editorViewRef.current.focus();
  }, []);

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
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => insertFormatting("ordered-list")}
          title="Numbered List"
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
          title="Link"
        >
          <Link className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => insertFormatting("code")}
          title="Code"
        >
          <Code className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <div ref={editorRef} className="h-full w-full" />
      </div>
    </div>
  );
}

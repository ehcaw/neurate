"use client";
import "@/components/styles.module.scss";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Input } from "../ui/input";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlock from "@tiptap/extension-code-block";
import { useCallback, forwardRef, useEffect, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Bold,
  Italic,
  List,
  ListOrdered,
  Image as ImageIcon,
  Link as LinkIcon,
  Code,
  FocusIcon,
  Pencil,
} from "lucide-react";
import { Note } from "@/lib/types";
import SlashCommands from "../custom-notebook-node/command-list";
import NodeWrapper from "../custom-notebook-node/node-wrapper";
import SketchPadImpl from "../custom-notebook-node/sketch";
import { invoke } from "@tauri-apps/api/core";
import { flushSync } from "react-dom";
import { notesStore } from "@/lib/context";
import {
  refreshNotes,
  refreshNotesTree,
  refreshRecentNotes,
} from "@/lib/utils";

interface TiptapProps {
  note: Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
}

export const Tiptap = forwardRef<any, TiptapProps>(
  ({ note, updateNote }, ref) => {
    const [localTitle, setLocalTitle] = useState(note.title || "");
    const { setNotes, setRecentNotes, setNotesTree } = notesStore();

    const editor = useEditor({
      extensions: [
        StarterKit,
        Image,
        Link.configure({ openOnClick: false }),
        Placeholder.configure({ placeholder: "Start writing..." }),
        CodeBlock,
        SlashCommands,
        NodeWrapper({
          component: SketchPadImpl,
          name: "sketchpad",
          group: "block",
          props: {},
        }),
      ],
      content: note.pages[0].content,
      onUpdate: ({ editor }) => {
        // Debounced save logic can be implemented here
        const newContent = editor.getHTML();
        updateNote(note.id, {
          pages: [
            {
              id: note.pages[0].id,
              created_at: note.pages[0].created_at,
              last_modified: String(Date.now()),
              content: newContent,
            },
          ],
        });
      },
    });
    useImperativeHandle(ref, () => ({
      editor,
      // You can expose specific methods if needed
      focus: () => editor?.chain().focus().run(),
      getContent: () => editor?.getHTML(),
      setContent: (content: string) => editor?.commands.setContent(content),
      // Add more methods as needed
    }));

    useEffect(() => {
      if (editor && note.pages[0].content !== editor.getHTML()) {
        // Use requestAnimationFrame to schedule after current render
        requestAnimationFrame(() => {
          flushSync(() => {
            editor.commands.setContent(note.pages[0].content);
          });
        });
      }
    }, [editor, note.id, note.pages[0].content]);

    useEffect(() => {
      setLocalTitle(note.title || "");
    }, [note.id, note.title]);

    // AI feature example - could be triggered by a button or slash command
    const generateAIContent = useCallback(() => {
      // Example AI integration
      if (!editor) return;

      // Get current selection or position
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, " ");

      // Make API call to AI service
      // For example: const response = await fetch('/api/ai/generate', { ... })

      // Insert AI-generated content
      editor
        .chain()
        .focus()
        .insertContent("AI generated text would go here")
        .run();
    }, [editor]);

    // Image upload example
    const uploadImage = useCallback(() => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";

      input.onchange = async (event) => {
        if (!editor) return;

        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        // You'd implement actual image upload here
        // For example:
        // const formData = new FormData()
        // formData.append('image', file)
        // const response = await fetch('/api/upload', { method: 'POST', body: formData })
        // const { url } = await response.json()

        // For now, using a placeholder:
        const url = URL.createObjectURL(file);

        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      };

      input.click();
    }, [editor]);

    const insertSketchPad = () => {
      if (editor) {
        editor.commands.insertContent({
          type: "sketchpad",
          attrs: {
            width: 300,
            height: 200,
            lines: [],
          },
        });
      }
    };

    const updateTitle = (title: String) => {
      console.log(note.id);
      invoke("update_title", { path: note.id, newTitle: title });
    };

    if (!editor) return null;

    return (
      <div className="flex flex-col h-full" data-editor>
        <div className="flex items-center justify-between p-2 border-b">
          <Input
            type="text"
            value={localTitle}
            onChange={(e) => {
              setLocalTitle(e.target.value);
            }}
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                updateNote(note.id, { title: localTitle });
                console.log(note.id);
                invoke("update_title", { path: note.id, newTitle: localTitle });
                e.currentTarget.blur();
                setNotes(await refreshNotes());
                setRecentNotes(await refreshRecentNotes());
                setNotesTree(await refreshNotesTree());
              }
            }}
            onBlur={async (e) => {
              // Also update when the input loses focus (user clicks elsewhere)
              if (localTitle !== note.title) {
                updateNote(note.id, { title: localTitle });
                invoke("update_title", { path: note.id, newTitle: localTitle });
                setNotes(await refreshNotes());
                setRecentNotes(await refreshRecentNotes());
                setNotesTree(await refreshNotesTree());
              }
            }}
            placeholder="Untitled"
            className="flex-1 bg-transparent border-none outline-none text-lg font-medium"
          />
        </div>

        <div className="border-b p-1 flex items-center gap-1 bg-muted/30">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={uploadImage}
            title="Upload Image"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const url = window.prompt("URL");
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }}
            title="Add Link"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code Block"
          >
            <Code className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertContent({
                  type: "sketchpad",
                  attrs: {
                    width: 1000,
                    height: 700,
                  },
                })
                .run()
            }
            title="Add Sketch"
          >
            <Pencil className="h-4 w-4" />
          </Button>

          {/* AI Feature Button Example */}
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={generateAIContent}
          >
            AI Assist
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <EditorContent
            editor={editor}
            className="prose prose-sm max-w-none dark:prose-invert min-h-[calc(100vh-10rem)]"
          />
        </div>
      </div>
    );
  },
);
Tiptap.displayName = "Tiptap";

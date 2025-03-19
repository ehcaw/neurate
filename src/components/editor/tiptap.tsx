"use client";

import { useEditor, EditorContent } from "@tiptap/react";
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
} from "lucide-react";
import type { Note } from "@/lib/note-utils";
import SlashCommands from "./command-list";

interface TiptapProps {
  note: Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  setIsPreviewMode: (isPreview: boolean) => void;
}

export const Tiptap = forwardRef<any, TiptapProps>(
  ({ note, updateNote, setIsPreviewMode }, ref) => {
    const editor = useEditor({
      extensions: [
        StarterKit,
        Image,
        Link.configure({ openOnClick: false }),
        Placeholder.configure({ placeholder: "Start writing..." }),
        CodeBlock,
        SlashCommands,
      ],
      content: note.content,
      onUpdate: ({ editor }) => {
        // Debounced save logic can be implemented here
        const content = editor.getHTML();
        updateNote(note.id, { content });
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

    // Update editor content when note changes
    useEffect(() => {
      if (editor && note.content !== editor.getHTML()) {
        editor.commands.setContent(note.content);
      }
    }, [editor, note.id, note.content]);

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

    if (!editor) return null;

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

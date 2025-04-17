import "@/components/styles.module.scss";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import BulletList from "@tiptap/extension-bullet-list";
import ListItem from "@tiptap/extension-list-item";
import Paragraph from "@tiptap/extension-paragraph";
import Blockquote from "@tiptap/extension-blockquote";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";

import { all, createLowlight } from "lowlight";
import { useCallback, forwardRef, useEffect, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Image as ImageIcon,
  Link as LinkIcon,
  Code,
  Pencil,
} from "lucide-react";
import { Note } from "@/lib/types";
import SlashCommands from "../custom-notebook-node/command-list";
import NodeWrapper from "../custom-notebook-node/node-wrapper";
import SketchPadImpl from "../custom-notebook-node/sketch";

interface TiptapProps {
  note: Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
}

const lowlight = createLowlight(all);

export const Tiptap = forwardRef<any, TiptapProps>(
  ({ note, updateNote }, ref) => {
    const editor = useEditor({
      extensions: [
        Document.configure({
          content: "block+",
        }),
        Text,
        StarterKit.configure({
          document: false, // Disable StarterKit's document since we configure it separately
          bulletList: false,
          listItem: false,
        }),
        Paragraph,
        ListItem.configure({
          HTMLAttributes: {
            class: "list-item",
          },
        }),
        BulletList.configure({
          HTMLAttributes: {
            class: "bullet-list",
          },
        }),
        Blockquote,
        TaskList,
        TaskItem,
        Image,
        Link.configure({ openOnClick: false }),
        Placeholder.configure({ placeholder: "Start writing..." }),
        CodeBlockLowlight.configure({ lowlight }),
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
      editorProps: {
        attributes: {
          class:
            "prose prose-sm max-w-none dark:prose-invert min-h-[calc(100vh-10rem)]",
        },
      },
    });

    useImperativeHandle(ref, () => ({
      editor,
      focus: () => editor?.chain().focus().run(),
      getContent: () => editor?.getHTML(),
      setContent: (content: string) => editor?.commands.setContent(content),
    }));

    useEffect(() => {
      if (editor && note.pages[0].content !== editor.getHTML()) {
        // Use requestAnimationFrame to schedule the update
        requestAnimationFrame(() => {
          editor.commands.setContent(note.pages[0].content);
        });
      }
    }, [editor, note.id, note.pages[0].content]);

    const uploadImage = useCallback(() => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";

      input.onchange = async (event) => {
        if (!editor) return;

        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      };

      input.click();
    }, [editor]);

    if (!editor) {
      return null;
    }

    return (
      <div className="flex flex-col h-full">
        <div className="border-b p-1 flex items-center gap-1 bg-muted/30">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={!editor.can().chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={!editor.can().chain().focus().toggleOrderedList().run()}
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
            disabled={!editor.can().chain().focus().toggleCodeBlock().run()}
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

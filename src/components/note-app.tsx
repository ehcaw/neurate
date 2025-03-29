"use client";

import { act, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Sidebar } from "./sidebar/sidebar";
import { CommandMenu } from "@/components/command-menu";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { Note, Metadata, PageContent, DrawingData } from "@/lib/types";

// Add import for the enhanced editor
import { Tiptap } from "./editor/notebook";
import { invoke } from "@tauri-apps/api/core";
import React, { Suspense } from "react";
import shortUUID, { uuid } from "short-uuid";
import { Editor, NodePos } from "@tiptap/react";

export default function NoteApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const initialLoadDone = useRef(false);
  const editorRef = useRef<{ editor: Editor }>(null);

  const router = useRouter();

  const pathname = usePathname();
  const searchParams = useSearchParams();
  //Load notes from memory
  useEffect(() => {
    const loadNotes = async () => {
      const notes: string[] = await invoke("gather_notes");
      const formattedNotes: Note[] = notes.map((note: string) =>
        JSON.parse(note),
      );
      setNotes(formattedNotes);
    };
    loadNotes();
  }, []);

  // Set active note from URL once on initial load
  useEffect(() => {
    if (!initialLoadDone.current || notes.length === 0) return;

    const noteId = searchParams.get("note");
    const noteExists = noteId && notes.some((note) => note.id === noteId);

    if (noteExists) {
      setActiveNoteId(noteId);
    } else if (notes.length > 0) {
      // No note ID in URL or invalid ID, default to first note
      setActiveNoteId(notes[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoadDone.current, notes.length, searchParams]);

  // Update URL when active note changes, using a ref to track previous value
  const prevActiveNoteIdRef = useRef(activeNoteId);
  useEffect(() => {
    if (!activeNoteId) return;

    // Skip update if we just initialized from URL
    if (prevActiveNoteIdRef.current === activeNoteId) return;
    prevActiveNoteIdRef.current = activeNoteId;

    // Use router.push instead of replace to avoid recording history entry
    const params = new URLSearchParams();
    params.set("note", activeNoteId);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [activeNoteId, pathname, router]);

  // Memoize the active note to prevent unnecessary re-renders
  const activeNote = useMemo(() => {
    return notes.find((note) => note.id === activeNoteId) || null;
  }, [notes, activeNoteId]);

  const createNote = useCallback(async () => {
    const title = `New Note ${notes.length + 1}`;
    const note: Note = {
      id: `untitled-${uuid()}.json`,
      title,
      metadata: {
        created_at: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
        note_type: "notebook",
        tags: [],
      },
      pages: [
        {
          id: uuid(),
          content: "",
          created_at: new Date().toISOString(),
          last_modified: new Date().toISOString(),
        },
      ],
    };

    // Save to filesystem
    await invoke("create_new_note", {
      title: "Untitled",
      noteType: "notebook",
    });

    // Update state
    setNotes((prev) => [...prev, note]);
    setActiveNoteId(title);
  }, [notes]);

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes((prev) => {
      const note = prev.find((n) => n.id === id);
      if (!note) return prev;

      const updatedNote: Note = {
        ...note,
        ...updates,
        metadata: {
          ...note.metadata,
          last_accessed: new Date().toISOString(),
        },
      };
      return prev.map((n) => (n.id === id ? updatedNote : n));
    });
  };

  // const getEditorContent = () => {
  //   let formattedEditorContent = "";
  //   if (editorRef.current) {
  //     editorRef.current.editor.state.doc.forEach((node, offset, index) => {
  //       console.log(node, offset, index);
  //     });
  //   }
  // };

  // const saveContent = useCallback((id: string, updates: Partial<Note>) => {
  //   if (editorRef) {
  //     invoke("write_file", {
  //       path: id,
  //       content: editorRef.current.editor.getJSON(),
  //     });
  //   }
  // }, []);

  const deleteNote = useCallback(
    async (title: string) => {
      if (notes.length <= 1) return; // Prevent deleting the last note

      // Find next note to select before filtering
      let nextNoteTitle = activeNoteId;
      if (activeNoteId === title) {
        const currentIndex = notes.findIndex((note) => note.title === title);
        const nextIndex = currentIndex === 0 ? 1 : 0;
        nextNoteTitle = notes[nextIndex].title;
      }

      // Delete from filesystem
      await invoke("delete_path", {
        path: `${title}.json`,
        recursive: false,
      });

      // Update notes list
      setNotes((prev) => prev.filter((note) => note.title !== title));

      // Update active note if needed
      if (activeNoteId === title) {
        setActiveNoteId(nextNoteTitle);
      }
    },
    [notes, activeNoteId],
  );

  // Register global hotkeys
  useHotkeys([
    {
      keys: "mod+p",
      callback: (e) => {
        e.preventDefault();
        setIsCommandMenuOpen(true);
      },
    },
    {
      keys: "mod+b",
      callback: (e) => {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      },
    },
    {
      keys: "mod+e",
      callback: (e) => {
        e.preventDefault();
        setIsPreviewMode((prev) => !prev);
        if (editorRef.current) {
          editorRef.current.editor.commands.focus("end");
        }
      },
    },
    {
      keys: "mod+n",
      callback: (e) => {
        e.preventDefault();
        createNote();
      },
    },
    {
      keys: "mod+j",
      callback: (e) => {
        e.preventDefault();
        // Navigate to next note
        if (notes.length > 1 && activeNoteId) {
          const currentIndex = notes.findIndex(
            (note) => note.id === activeNoteId,
          );
          const nextIndex = (currentIndex + 1) % notes.length;
          setActiveNoteId(notes[nextIndex].id);
        }
      },
    },
    {
      keys: "mod+k",
      callback: (e) => {
        e.preventDefault();
        // Navigate to previous note
        if (notes.length > 1 && activeNoteId) {
          const currentIndex = notes.findIndex(
            (note) => note.id === activeNoteId,
          );
          const prevIndex = (currentIndex - 1 + notes.length) % notes.length;
          setActiveNoteId(notes[prevIndex].id);
        }
      },
    },
    {
      keys: "mod+s",
      callback: (e) => {
        e.preventDefault();
        // Force save current note
        if (activeNoteId && editorRef.current?.editor) {
          const note = notes.find((note) => note.id === activeNoteId);
          if (!note) return;

          // Get HTML content from the editor
          const htmlContent = editorRef.current.editor.getHTML();

          console.log(htmlContent);

          // Create an updated version of the note
          const updatedNote = {
            ...note,
            pages: note.pages.map((page, index) =>
              index === 0
                ? {
                    // Assuming we're editing the first page
                    ...page,
                    content: htmlContent,
                    last_modified: new Date().toISOString(),
                  }
                : page,
            ),
            metadata: {
              ...note.metadata,
              last_accessed: new Date().toISOString(),
            },
          };

          // Stringify the entire updated note
          const noteJson = JSON.stringify(updatedNote, null, 2);

          // Save to file system
          invoke("write_file", {
            path: note.id, // Use the full path stored in note.id
            content: noteJson,
          })
            .then(() => {
              console.log("Note saved successfully");

              // Update state
              setNotes((prev) =>
                prev.map((n) => (n.id === note.id ? updatedNote : n)),
              );
            })
            .catch((err) => {
              console.error("Failed to save note:", err);
            });
        }
      },
    },
    {
      keys: "alt+1",
      callback: (e) => {
        e.preventDefault();
        // Focus sidebar
        const sidebarElement = document.querySelector("[data-sidebar]");
        if (sidebarElement) {
          (sidebarElement as HTMLElement).focus();
        }
      },
    },
    {
      keys: "alt+2",
      callback: (e) => {
        e.preventDefault();
        // Focus editor
        const editorElement = document.querySelector("[data-editor]");
        if (editorElement) {
          (editorElement as HTMLElement).focus();
        }
      },
    },
    {
      keys: "escape",
      callback: (e) => {
        // Close any open modal or menu
        if (isCommandMenuOpen) {
          setIsCommandMenuOpen(false);
        }
      },
    },
  ]);

  return (
    <div className="flex h-full bg-background">
      <Sidebar
        notes={notes}
        activeNoteId={activeNoteId}
        setActiveNoteId={setActiveNoteId}
        createNote={createNote}
        deleteNote={deleteNote}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="flex-1 flex flex-col h-full overflow-auto">
        {activeNote ? (
          <div>
            {/* Only render Tiptap on client-side */}
            {typeof window !== "undefined" && (
              <Tiptap
                key={activeNote.id} /* Force re-render when note changes */
                ref={editorRef}
                note={activeNote}
                updateNote={updateNote}
                setIsPreviewMode={setIsPreviewMode}
              />
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">No Note Selected</h2>
              <button
                onClick={createNote}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
              >
                Create a new note
              </button>
            </div>
          </div>
        )}
      </div>

      {isCommandMenuOpen && (
        <CommandMenu
          notes={notes}
          setActiveNoteId={setActiveNoteId}
          createNote={createNote}
          isOpen={isCommandMenuOpen}
          setIsOpen={setIsCommandMenuOpen}
        />
      )}
    </div>
  );
}

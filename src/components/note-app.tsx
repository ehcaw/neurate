"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Sidebar } from "./sidebar/sidebar";
import { CommandMenu } from "@/components/command-menu";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { Note } from "@/lib/types";

// Add import for the enhanced editor
import { invoke } from "@tauri-apps/api/core";
import React from "react";
import { NoteDisplay } from "./editor/display";
import {
  DropdownMenu,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./ui/dropdown-menu";
import { Plus } from "lucide-react";
import { notesStore } from "@/lib/context";
import {
  refreshNotes,
  refreshNotesTree,
  refreshRecentNotes,
} from "@/lib/utils";

export default function NoteApp() {
  //const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const initialLoadDone = useRef(false);
  const editorRef = useRef<any>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { notes, setNotes, setNotesTree, setRecentNotes } = notesStore();

  //Load notes from memory
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const notes: string[] = await invoke("gather_notes");
        const formattedNotes: Note[] = notes.map((note: string) =>
          JSON.parse(note),
        );
        setNotes(formattedNotes);
        initialLoadDone.current = true;
      } catch (error) {
        console.error("Failed to load notes:", error);
      }
    };
    loadNotes();
  }, []);

  // Set active note from URL once on initial load
  useEffect(() => {
    if (!initialLoadDone.current || notes.length === 0) return;

    const noteId = searchParams?.get("note");
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

  const createNote = useCallback(async (note_type: string) => {
    try {
      const filePath = await invoke("create_new_note", {
        title: "Untitled",
        noteType: note_type,
      });

      console.log("Created note at path:", filePath);

      // Refresh notes list to include the new note
      const updatedNotes: string[] = await invoke("gather_notes");
      const formattedNotes: Note[] = updatedNotes.map((note: string) =>
        JSON.parse(note),
      );
      setNotes(formattedNotes);

      // Set the new note as active - This assumes the last note in the array is the new one
      // You might need a better way to identify the new note
      if (formattedNotes.length > 0 && typeof filePath === "string") {
        // Find the note with the matching path
        const newNote = formattedNotes.find((note) => note.id === filePath);
        if (newNote) {
          setActiveNoteId(newNote.id);
        }
      }
      setNotes(await refreshNotes());
      setNotesTree(await refreshNotesTree());
      setRecentNotes(await refreshRecentNotes());
    } catch (error) {
      console.error("Failed to create new note:", error);
    }
  }, []);

  const deleteNote = useCallback(
    async (path: string) => {
      if (notes.length <= 1) return; // Prevent deleting the last note

      try {
        // Find next note to select before filtering
        let nextNoteId = activeNoteId;
        if (activeNoteId === path) {
          const currentIndex = notes.findIndex((note) => note.id === path);
          const nextIndex = currentIndex === 0 ? 1 : currentIndex - 1;
          nextNoteId =
            nextIndex >= 0 && nextIndex < notes.length
              ? notes[nextIndex].id
              : null;
        }

        // Delete from filesystem
        await invoke("delete_path", {
          path: path,
          recursive: false,
        });

        // Refresh notes list
        const updatedNotes: string[] = await invoke("gather_notes");
        const formattedNotes: Note[] = updatedNotes.map((note: string) =>
          JSON.parse(note),
        );
        setNotes(formattedNotes);

        // Update active note if needed
        if (activeNoteId === path && nextNoteId) {
          setActiveNoteId(nextNoteId);
        }
      } catch (error) {
        console.error("Failed to delete note:", error);
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
        createNote("notebook");
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
      callback: async (e) => {
        e.preventDefault();
        const note = notes.find((note) => note.id === activeNoteId);
        if (activeNoteId && editorRef.current) {
          // Save note based on type
          if (note?.metadata.note_type === "notebook") {
            const htmlContent = editorRef.current.getHTML();
            invoke("update_notebook_content", {
              path: note.id,
              pageId: note.pages[0].id,
              content: htmlContent,
            });
            setNotes(await refreshNotes());
            setRecentNotes(await refreshRecentNotes());
            setNotesTree(await refreshNotesTree());
            console.log("Saving notebook:", htmlContent);
          } else if (note?.metadata.note_type === "freenote") {
            const htmlContent = editorRef.current.getHTML();
            invoke("update_freenote_content", {
              path: note.id,
              pageId: note.pages[0].id,
              content: htmlContent.content,
              lines: JSON.stringify(htmlContent.lines),
            });
            setNotes(await refreshNotes());
            setRecentNotes(await refreshRecentNotes());
            setNotesTree(await refreshNotesTree());
          }
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
              <div>
                <NoteDisplay
                  ref={editorRef}
                  note={activeNote}
                  type={activeNote.metadata.note_type}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">No Note Selected</h2>
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" /> Create New Note
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuItem onClick={() => createNote("notebook")}>
                    Notebook
                    <DropdownMenuShortcut className="text-xs text-gray-500">
                      Block based note taking
                    </DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => createNote("freenote")}>
                    Free-note
                    <DropdownMenuShortcut className="text-xs text-gray-500">
                      Flexible canvas with layers
                    </DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

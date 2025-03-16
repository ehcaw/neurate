"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { debounce } from "@/lib/utils";
import { Sidebar } from "@/components/sidebar";
import { Preview } from "@/components/preview";
import { CommandMenu } from "@/components/command-menu";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { type Note, createEmptyNote } from "@/lib/note-utils";
// Add import for the enhanced editor
import { EnhancedEditor } from "@/components/enhanced-editor";

export default function NoteApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const initialLoadDone = useRef(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Load notes from localStorage on initial render
  useEffect(() => {
    if (initialLoadDone.current) return;

    try {
      const savedNotes = localStorage.getItem("notes");
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes));
      } else {
        // Create a welcome note if no notes exist
        const welcomeNote = createEmptyNote("Welcome to FastNotes");
        welcomeNote.content =
          "# Welcome to FastNotes\n\nA blazing fast note-taking app inspired by Obsidian.\n\n## Features\n\n- ⚡ Lightning fast performance\n- 📝 Markdown support\n- 🔍 Quick search\n- ⌨️ Keyboard shortcuts\n\nPress `Ctrl+P` to open the command menu.";
        setNotes([welcomeNote]);
        setActiveNoteId(welcomeNote.id);
      }
      initialLoadDone.current = true;
    } catch (error) {
      console.error("Failed to load notes:", error);
    }
  }, []);

  // Use debounced save for better performance
  const saveNotesToStorage = useCallback(
    debounce((notesToSave: Note[]) => {
      console.log("Saving notes to storage");
      localStorage.setItem("notes", JSON.stringify(notesToSave));
    }, 500),
    [],
  );

  // Save notes to localStorage whenever they change
  useEffect(() => {
    if (notes.length > 0) {
      saveNotesToStorage(notes);
    }
  }, [notes, saveNotesToStorage]);

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

  const createNote = useCallback(() => {
    const newNote = createEmptyNote("Untitled Note");
    setNotes((prev) => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    return newNote;
  }, []);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id
          ? { ...note, ...updates, updatedAt: new Date().toISOString() }
          : note,
      ),
    );
  }, []);

  const deleteNote = useCallback(
    (id: string) => {
      if (notes.length <= 1) return; // Prevent deleting the last note

      // Find next note to select before filtering
      let nextNoteId = activeNoteId;
      if (activeNoteId === id) {
        const currentIndex = notes.findIndex((note) => note.id === id);
        const nextIndex = currentIndex === 0 ? 1 : 0;
        nextNoteId = notes[nextIndex].id;
      }

      // Update notes list first
      setNotes((prev) => prev.filter((note) => note.id !== id));

      // Then update active note if needed
      if (activeNoteId === id) {
        setActiveNoteId(nextNoteId);
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
        if (activeNoteId) {
          const note = notes.find((note) => note.id === activeNoteId);
          if (note) {
            updateNote(activeNoteId, { updatedAt: new Date().toISOString() });
            // Show a toast or notification that the note was saved
            console.log("Note saved");
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
        notes={notes}
        activeNoteId={activeNoteId}
        setActiveNoteId={setActiveNoteId}
        createNote={createNote}
        deleteNote={deleteNote}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {activeNote ? (
          <>
            {isPreviewMode ? (
              <Preview note={activeNote} setIsPreviewMode={setIsPreviewMode} />
            ) : (
              <EnhancedEditor
                note={activeNote}
                updateNote={updateNote}
                setIsPreviewMode={setIsPreviewMode}
              />
            )}
          </>
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

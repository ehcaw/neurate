"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import {
  FileText,
  Plus,
  Search,
  FileDown,
  FileUp,
  Moon,
  Sun,
} from "lucide-react";
import { Note } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CommandMenuProps {
  notes: Note[];
  setActiveNoteId: (id: string) => void;
  createNote: (note_type: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function CommandMenu({
  notes,
  setActiveNoteId,
  createNote,
  isOpen,
  setIsOpen,
}: CommandMenuProps) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setIsOpen]);

  const handleSelect = (id: string) => {
    setActiveNoteId(id);
    setIsOpen(false);
  };

  const handleCreateNote = () => {
    createNote("notebook");
    setIsOpen(false);
  };

  const toggleTheme = () => {
    const html = document.documentElement;
    const isDark = html.classList.contains("dark");

    if (isDark) {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }

    setIsOpen(false);
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm",
        isOpen ? "animate-in fade-in-0" : "animate-out fade-out-0",
      )}
      onClick={() => setIsOpen(false)}
    >
      <div
        className="fixed left-1/2 top-1/3 w-full max-w-md -translate-x-1/2 -translate-y-1/2"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="rounded-lg border shadow-md" loop>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search notes, commands..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm">
              No results found.
            </Command.Empty>

            <Command.Group heading="Notes">
              {notes.map((note) => (
                <Command.Item
                  key={note.id}
                  value={`note-${note.id}`}
                  onSelect={() => handleSelect(note.id)}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm"
                >
                  <FileText className="h-4 w-4" />
                  <span className="truncate">{note.title || "Untitled"}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Actions">
              <Command.Item
                value="create-note"
                onSelect={handleCreateNote}
                className="flex items-center gap-2 px-2 py-1.5 text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Create new note</span>
              </Command.Item>

              <Command.Item
                value="toggle-theme"
                onSelect={toggleTheme}
                className="flex items-center gap-2 px-2 py-1.5 text-sm"
              >
                <Sun className="h-4 w-4 dark:hidden" />
                <Moon className="hidden h-4 w-4 dark:block" />
                <span>Toggle theme</span>
              </Command.Item>

              <Command.Item
                value="export-notes"
                onSelect={() => {
                  // Export notes as JSON
                  const dataStr = JSON.stringify(notes, null, 2);
                  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

                  const exportFileDefaultName = `fastnotes-export-${new Date().toISOString().slice(0, 10)}.json`;

                  const linkElement = document.createElement("a");
                  linkElement.setAttribute("href", dataUri);
                  linkElement.setAttribute("download", exportFileDefaultName);
                  linkElement.click();

                  setIsOpen(false);
                }}
                className="flex items-center gap-2 px-2 py-1.5 text-sm"
              >
                <FileDown className="h-4 w-4" />
                <span>Export notes</span>
              </Command.Item>

              <Command.Item
                value="import-notes"
                onSelect={() => {
                  // Create a file input element
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".json";

                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = (e) => {
                      try {
                        const content = e.target?.result as string;
                        const importedNotes = JSON.parse(content);

                        // Store imported notes in localStorage
                        localStorage.setItem(
                          "notes",
                          JSON.stringify(importedNotes),
                        );

                        // Reload the page to load the imported notes
                        window.location.reload();
                      } catch (error) {
                        console.error("Failed to import notes:", error);
                        alert(
                          "Failed to import notes. Please check the file format.",
                        );
                      }
                    };
                    reader.readAsText(file);
                  };

                  input.click();
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 px-2 py-1.5 text-sm"
              >
                <FileUp className="h-4 w-4" />
                <span>Import notes</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

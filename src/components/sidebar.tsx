"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Note } from "@/lib/note-utils";
import { cn } from "@/lib/utils";

interface SidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  setActiveNoteId: (id: string | null) => void;
  createNote: () => void;
  deleteNote: (id: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({
  notes,
  activeNoteId,
  setActiveNoteId,
  createNote,
  deleteNote,
  isOpen,
  setIsOpen,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Memoize filtered notes for performance
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;

    const query = searchQuery.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query),
    );
  }, [notes, searchQuery]);

  return (
    <>
      <div
        className={cn(
          "h-full border-r border-border bg-background transition-all duration-300 ease-in-out",
          isOpen ? "w-64" : "w-0",
        )}
      >
        {isOpen && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold truncate">Notes ({notes.length})</h2>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={createNote}
                  title="New note"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  title="Hide sidebar"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-7 w-7"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {filteredNotes.length > 0 ? (
                  filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className={cn(
                        "group flex items-center justify-between rounded-md px-2 py-1.5 text-sm",
                        activeNoteId === note.id
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-muted",
                      )}
                    >
                      <button
                        className="flex items-center gap-2 truncate flex-1 text-left"
                        onClick={() => setActiveNoteId(note.id)}
                      >
                        <FileText className="h-4 w-4 shrink-0 opacity-70" />
                        <span className="truncate">
                          {note.title || "Untitled"}
                        </span>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNote(note.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    No notes found
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {!isOpen && (
        <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-4 z-10"
          onClick={() => setIsOpen(true)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </>
  );
}

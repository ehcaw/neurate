"use client";

import type React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { Note } from "@/lib/note-utils";

interface NoteTabsProps {
  notes: Note[];
  activeNoteId: string | null;
  setActiveNoteId: (id: string) => void;
  openNotes: string[];
  setOpenNotes: (ids: string[]) => void;
}

export function NoteTabs({
  notes,
  activeNoteId,
  setActiveNoteId,
  openNotes,
  setOpenNotes,
}: NoteTabsProps) {
  // Get the note objects for open notes
  const openNoteObjects = notes.filter((note) => openNotes.includes(note.id));

  const handleTabClick = (id: string) => {
    setActiveNoteId(id);
  };

  const handleCloseTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newOpenNotes = openNotes.filter((noteId) => noteId !== id);
    setOpenNotes(newOpenNotes);

    // If we're closing the active tab, activate another tab
    if (id === activeNoteId && newOpenNotes.length > 0) {
      setActiveNoteId(newOpenNotes[0]);
    }
  };

  return (
    <div className="border-b border-border">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex h-10">
          {openNoteObjects.map((note) => (
            <button
              key={note.id}
              className={cn(
                "group inline-flex h-10 items-center justify-center gap-1.5 border-r border-border px-4 text-sm font-medium",
                activeNoteId === note.id
                  ? "bg-background text-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted",
              )}
              onClick={() => handleTabClick(note.id)}
            >
              <span className="max-w-32 truncate">
                {note.title || "Untitled"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-full opacity-0 group-hover:opacity-100"
                onClick={(e) => handleCloseTab(e, note.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="h-2.5" />
      </ScrollArea>
    </div>
  );
}

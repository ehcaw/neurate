import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { Note } from "./types";

interface NoteSlice {
  notesTree: any;
  notes: Note[];
  recentNotes: Note[];
  setNotesTree: (noteTree: any) => void;
  setNotes: (notes: Note[]) => void;
  setRecentNotes: (notes: Note[]) => void;
}

export const notesStore = create<NoteSlice>((set) => ({
  notesTree: null,
  notes: [],
  recentNotes: [],
  setNotesTree: (noteTree: any) => set({ notesTree: noteTree }),
  setNotes: (notes: Note[]) => set({ notes: notes }),
  setRecentNotes: (notes: Note[]) => set({ recentNotes: notes }),
}));

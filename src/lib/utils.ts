import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { invoke } from "@tauri-apps/api/core";
import { Note } from "./types";
import { notesStore } from "./context";
import { Rect } from "react-konva";
import { lt } from "lodash";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

export async function refreshNotes() {
  const notes: string[] = await invoke("gather_notes");
  const formattedNotes: Note[] = notes.map((note: string) => JSON.parse(note));
  return formattedNotes;
}

export async function refreshNotesTree() {
  const treeData = await invoke("get_notes_tree");
  return treeData;
}

export async function refreshRecentNotes() {
  const notes: string[] = await invoke("gather_notes");
  const formattedNotes: Note[] = notes
    .map((note: string) => JSON.parse(note))
    .sort((a, b) => {
      return (
        new Date(b.metadata.last_accessed).getTime() -
        new Date(a.metadata.last_accessed).getTime()
      );
    })
    .slice(0, 5); // Get 5 most recent notes
  return formattedNotes;
}

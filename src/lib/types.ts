export interface DrawingData {
  tool: string;
  points: number[];
}

export interface NotebookPageContent {
  id: string;
  content: string;
  created_at: string;
  last_modified: string;
}

export interface FreenotePageContent {
  id: string;
  lines: {
    tool: "brush" | "eraser";
    points: number[];
    color?: string;
    width?: number;
  }[];
  content: string;
  created_at: string;
  last_modified: string;
}

export interface Metadata {
  created_at: string;
  last_accessed: string;
  note_type: "freenote" | "notebook";
  tags: string[];
}

export interface Note {
  id: string; // every id is unique and the id will be the path
  title: string;
  metadata: Metadata;
  pages: NotebookPageContent[] | FreenotePageContent[];
}

export interface RichSketchpadData {
  textContent: string; // HTML content from Quill
  lines: {
    tool: "brush" | "eraser";
    points: number[];
    color?: string;
    width?: number;
  }[];
}

export interface StandaloneRichSketchpadProps {
  note: Note;
  width?: number;
  height?: number;
  updateNote: (id: string, updates: Partial<Note>) => void;
}

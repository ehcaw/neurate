export interface DrawingData {
  tool: string;
  points: number[];
}

export interface PageContent {
  id: string;
  content: string;
  drawings: DrawingData[];
  created_at: string;
  last_modified: string;
}

export interface Metadata {
  created_at: string;
  last_accessed: string;
  note_tpe: "free_note" | "notebook";
  tags: string[];
}

export interface Note {
  id: string; // every id is unique and the id will be the path
  title: string;
  metadata: Metadata;
  pages: PageContent[];
}

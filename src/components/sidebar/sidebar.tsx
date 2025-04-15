import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Folder, FolderOpen, ChevronDown, Plus, PanelLeft } from "lucide-react";
import {
  cn,
  refreshNotesTree,
  refreshRecentNotes,
  refreshNotes,
} from "@/lib/utils";
import { NoteTreeItem } from "./note-tree-item";
import { Button } from "@/components/ui/button";
import { notesStore } from "@/lib/context";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
  DropdownMenuContent,
} from "../ui/dropdown-menu";

// Define props for the sidebar
interface SidebarProps {
  activeNoteId: string | null;
  setActiveNoteId: (id: string) => void;
  createNote: (noteType: string) => Promise<void>;
  deleteNote: (path: string) => Promise<void>;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeNoteId,
  setActiveNoteId,
  createNote,
  deleteNote,
  isOpen,
  setIsOpen,
}) => {
  // State management
  //const [notesTree, setNotesTree] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  //const [recentNotes, setRecentNotes] = useState<Note[]>([]);

  const { notesTree, recentNotes, setNotesTree, setRecentNotes, setNotes } =
    notesStore();

  // Toggle folder expansion
  const toggleFolder = useCallback((folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  }, []);

  // Handle note click
  const handleNoteClick = useCallback(
    (noteId: string) => {
      setActiveNoteId(noteId);
    },
    [setActiveNoteId],
  );

  // Handle note deletion
  const handleDeleteClick = useCallback(
    async (e: React.MouseEvent | null, noteId: string) => {
      if (e) e.stopPropagation();
      deleteNote(noteId);
      setNotes(await refreshNotes());
      setRecentNotes(await refreshRecentNotes());
      setNotesTree(await refreshNotesTree());
    },
    [deleteNote],
  );

  // Handle note pinning
  const handlePinNote = useCallback((noteId: string) => {
    // Add your pinning logic here
    console.log("Pin note:", noteId);
  }, []);

  // Handle folder creation
  const handleCreateFolder = useCallback(() => {
    // Implement folder creation logic
    console.log("Create folder");
  }, []);

  // Fetch the notes tree from the Rust backend
  const fetchNotesTree = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Call the Rust function to get the organized notes tree structure
      setNotesTree(await refreshNotesTree());

      // Also fetch recent notes from gather_notes
      setRecentNotes(await refreshRecentNotes());

      setIsLoading(false);
    } catch (err) {
      console.error("Failed to fetch notes tree:", err);
      setError(typeof err === "string" ? err : "Failed to fetch notes");
      setIsLoading(false);
    }
  }, []);

  // Render tree function
  const renderTree = useCallback(
    (nodes: any, parentPath: string[] = []) => {
      if (!nodes) return null;

      // If nodes is an array (from backend), render the array items
      if (Array.isArray(nodes)) {
        return nodes.map((node) => {
          const pathString = node.path;

          if (node.is_directory) {
            const isExpanded = expandedFolders.has(pathString);

            return (
              <div key={pathString}>
                <ContextMenu>
                  <ContextMenuTrigger>
                    <div
                      className={cn(
                        "flex items-center gap-1 py-1 px-2 text-sm rounded-md cursor-pointer",
                        "hover:bg-muted",
                      )}
                      onClick={() => toggleFolder(pathString)}
                    >
                      <div className="w-4 h-4 flex-shrink-0">
                        {isExpanded ? (
                          <FolderOpen className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <Folder className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <span className="truncate">{node.name}</span>
                      <ChevronDown
                        className={cn(
                          "ml-auto h-4 w-4 transition-transform",
                          isExpanded
                            ? "transform rotate-0"
                            : "transform rotate-[-90deg]",
                        )}
                      />
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onSelect={() => createNote("notebook")}>
                      New Note
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={handleCreateFolder}>
                      New Folder
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem>Rename</ContextMenuItem>
                    <ContextMenuItem className="text-red-500">
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>

                {isExpanded && node.children && (
                  <div className="ml-3 pl-2 border-l border-border">
                    {renderTree(node.children)}
                  </div>
                )}
              </div>
            );
          } else {
            // Process JSON files as notes
            if (node.path.endsWith(".json")) {
              // Extract note ID (path) and title
              const noteId = node.path;
              const noteTitle = node.name.endsWith(".json")
                ? node.name.slice(0, -5)
                : node.name;

              return (
                <NoteTreeItem
                  key={noteId}
                  note={{
                    id: noteId,
                    title: noteTitle,
                    isModified: false, // Use your state management here
                    isPinned: false, // Use your state management here
                  }}
                  isActive={activeNoteId === noteId}
                  onClick={() => {
                    console.log("Clicking note with ID:", noteId);
                    handleNoteClick(noteId);
                  }}
                  onDelete={(e) => handleDeleteClick(e, noteId)}
                  onPin={() => handlePinNote(noteId)}
                />
              );
            }
            return null; // Skip non-JSON files
          }
        });
      }

      // Maintain backwards compatibility with existing code structure
      // if someone passes an object instead of array
      const entries = Object.entries(nodes);
      if (entries.length === 0) return null;

      return entries.map(([key, value]: [string, any]) => {
        // Use the provided parentPath to build the current path
        const currentPath = [...parentPath, key];
        const pathString = currentPath.join("/");

        if (value.type === "folder") {
          const isExpanded = expandedFolders.has(pathString);

          return (
            <div key={pathString}>
              <ContextMenu>
                <ContextMenuTrigger>
                  <div
                    className={cn(
                      "flex items-center gap-1 py-1 px-2 text-sm rounded-md cursor-pointer",
                      "hover:bg-muted",
                    )}
                    onClick={() => toggleFolder(pathString)}
                  >
                    <div className="w-4 h-4 flex-shrink-0">
                      {isExpanded ? (
                        <FolderOpen className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <Folder className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <span className="truncate">{value.name}</span>
                    <ChevronDown
                      className={cn(
                        "ml-auto h-4 w-4 transition-transform",
                        isExpanded
                          ? "transform rotate-0"
                          : "transform rotate-[-90deg]",
                      )}
                    />
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onSelect={() => createNote("notebook")}>
                    New Note
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={handleCreateFolder}>
                    New Folder
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem>Rename</ContextMenuItem>
                  <ContextMenuItem className="text-red-500">
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>

              {isExpanded && (
                <div className="ml-3 pl-2 border-l border-border">
                  {renderTree(value.children, currentPath)}
                </div>
              )}
            </div>
          );
        } else if (value.type === "note") {
          return (
            <NoteTreeItem
              key={value.id}
              note={{
                id: value.id,
                title: value.title || "Untitled",
                isModified: value.isModified || false,
                isPinned: value.isPinned || false,
              }}
              isActive={activeNoteId === value.id}
              onClick={() => {
                console.log("Clicking note with ID:", value.id);
                handleNoteClick(value.id);
              }}
              onDelete={(e) => handleDeleteClick(e, value.id)}
              onPin={() => handlePinNote(value.id)}
            />
          );
        }

        return null;
      });
    },
    [
      expandedFolders,
      activeNoteId,
      handleNoteClick,
      handleDeleteClick,
      createNote,
      handleCreateFolder,
      handlePinNote,
      toggleFolder,
    ],
  );

  // Load notes on component mount
  useEffect(() => {
    fetchNotesTree();
  }, [fetchNotesTree]);

  // When activeNoteId changes, refresh recent notes
  useEffect(() => {
    if (activeNoteId) {
      // Optional: Update recent notes when active note changes
    }
  }, [activeNoteId]);

  // Toggle sidebar function
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  // If sidebar is collapsed, show only the toggle button
  if (!isOpen) {
    return (
      <div className="border-r border-border p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="mb-2"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className="h-full w-64 border-r border-border overflow-y-auto"
      data-sidebar
    >
      {/* Sidebar Header with Toggle and Create Button */}
      <div className="flex items-center justify-between p-2 border-b border-border">
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <PanelLeft className="h-4 w-4" />
        </Button>
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

      {/* Recent Notes Section */}
      <div className="p-2">
        <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
          Recent
        </h3>
        <div className="space-y-1">
          {recentNotes.map((note) => (
            <div
              key={note.id}
              className={cn(
                "text-sm py-1 px-2 rounded-md cursor-pointer truncate",
                activeNoteId === note.id
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted",
              )}
              onClick={() => handleNoteClick(note.id)}
            >
              {note.title}
            </div>
          ))}
        </div>
      </div>

      {/* All Notes Section with Tree View */}
      <div className="p-2">
        <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
          Files
        </h3>

        {isLoading ? (
          <div className="flex justify-center p-4">Loading notes...</div>
        ) : error ? (
          <div className="text-red-500 p-4">{error}</div>
        ) : (
          renderTree(notesTree)
        )}
      </div>
    </div>
  );
};

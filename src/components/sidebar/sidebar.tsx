"use client";

import type React from "react";
import { useMemo, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  History,
  Plus,
  Search,
  Settings,
  Star,
  X,
} from "lucide-react";
import type { Note } from "@/lib/note-utils";
import { cn } from "@/lib/utils";
import { KeyboardHelp } from "@/components/keyboard-help";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarSection } from "./sidebar-section";
import { NoteTreeItem } from "./note-tree-item";
import { useHotkeys, useHotkeysWithCallback } from "@/hooks/use-hotkeys";
import { invoke } from "@tauri-apps/api/core";

// Extended Note type with additional properties
interface ExtendedNote extends Note {
  path?: string[];
  isModified?: boolean;
  lastModified?: Date;
  isPinned?: boolean;
}

interface SidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  setActiveNoteId: (id: string) => void;
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
  const [activeView, setActiveView] = useState<"explorer" | "search">(
    "explorer",
  );
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["root"]),
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Convert flat notes to tree structure
  const notesTree = useMemo(() => {
    // For demo purposes, let's create a sample folder structure
    // In a real app, you'd get this from your Rust backend
    const extendedNotes: ExtendedNote[] = notes.map((note, index) => {
      // Assign some notes to folders for demonstration
      let path: string[] = [];
      if (index % 3 === 0) {
        path = ["Projects"];
      } else if (index % 5 === 0) {
        path = ["Archive"];
      } else if (index % 7 === 0) {
        path = ["Projects", "Personal"];
      }

      return {
        ...note,
        path,
        isModified: index % 4 === 0,
        lastModified: new Date(Date.now() - Math.random() * 10000000000),
        isPinned: index % 9 === 0,
      };
    });

    return buildNoteTree(extendedNotes);
  }, [notes]);

  // Get recently modified notes
  const recentNotes = useMemo(() => {
    const extendedNotes = notes.map((note) => ({
      ...note,
      lastModified: new Date(Date.now() - Math.random() * 10000000000),
    }));

    return [...extendedNotes]
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
      .slice(0, 5);
  }, [notes]);

  // Get pinned/favorite notes
  const pinnedNotes = useMemo(() => {
    // For demo, let's pin some notes
    return notes.filter((_, index) => index % 9 === 0);
  }, [notes]);

  // Filtered notes for search
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query),
    );
  }, [notes, searchQuery]);

  // Handle keyboard navigation
  useHotkeysWithCallback("ctrl+p", () => {
    setActiveView("search");
    searchInputRef.current?.focus();
  });

  useHotkeysWithCallback("escape", () => {
    if (activeView === "search" && searchQuery) {
      setSearchQuery("");
    } else if (activeView === "search") {
      setActiveView("explorer");
    }
  });

  // Handlers
  const handleNoteClick = useCallback(
    (id: string) => {
      setActiveNoteId(id);
    },
    [setActiveNoteId],
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      deleteNote(id);
    },
    [deleteNote],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      if (e.target.value) {
        setActiveView("search");
      }
    },
    [],
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setActiveView("explorer");
  }, []);

  const toggleFolder = useCallback((folderPath: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  }, []);

  const handleCreateFolder = useCallback(() => {
    // This would be implemented with your Rust backend
    console.log("Create folder");
  }, []);

  const handlePinNote = useCallback((id: string) => {
    // This would be implemented with your Rust backend
    console.log("Pin note", id);
  }, []);

  // Helper function to build tree structure
  function buildNoteTree(notes: ExtendedNote[]) {
    const tree: any = { root: { children: {} } };

    // First pass: create folder structure
    notes.forEach((note) => {
      let currentLevel = tree.root.children;

      if (note.path && note.path.length > 0) {
        for (const folder of note.path) {
          if (!currentLevel[folder]) {
            currentLevel[folder] = {
              type: "folder",
              name: folder,
              children: {},
            };
          }
          currentLevel = currentLevel[folder].children;
        }
      }

      // Add the note to the current level
      currentLevel[note.id] = {
        type: "note",
        id: note.id,
        title: note.title || "Untitled",
        isModified: note.isModified,
        isPinned: note.isPinned,
      };
    });

    return tree;
  }

  // Render tree recursively
  const renderTree = useCallback(
    (node: any, path: string[] = []) => {
      if (!node) return null;

      const entries = Object.entries(node);
      if (entries.length === 0) return null;

      return entries.map(([key, value]: [string, any]) => {
        const currentPath = [...path, key];
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
                  <ContextMenuItem onSelect={() => createNote()}>
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
                  {renderTree(value.children, [...path, key])}
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
                title: value.title,
                isModified: value.isModified,
                isPinned: value.isPinned,
              }}
              isActive={activeNoteId === value.id}
              onClick={() => handleNoteClick(value.id)}
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
    ],
  );

  return (
    <>
      <div
        className={cn(
          "h-full border-r border-border bg-background transition-all duration-300 ease-in-out",
          isOpen ? "w-72" : "w-0",
        )}
        data-sidebar
        tabIndex={0}
      >
        {isOpen && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-3 border-b">
              <h2 className="font-semibold truncate">Notes ({notes.length})</h2>
              <div className="flex items-center gap-1">
                <KeyboardHelp />
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

            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notes... (Ctrl+P)"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-8 h-9"
                  ref={searchInputRef}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-7 w-7"
                    onClick={handleClearSearch}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            <div className="border-b">
              <Tabs
                defaultValue="explorer"
                value={activeView}
                onValueChange={(value) =>
                  setActiveView(value as "explorer" | "search")
                }
                className="w-full"
              >
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="explorer">Explorer</TabsTrigger>
                  <TabsTrigger value="search">Search</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <ScrollArea className="flex-1">
              {activeView === "explorer" ? (
                <div className="p-1">
                  <div className="flex items-center justify-between p-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      EXPLORER
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={createNote}
                        title="New note"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={handleCreateFolder}
                        title="New folder"
                      >
                        <Folder className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Pinned Notes Section */}
                  {pinnedNotes.length > 0 && (
                    <SidebarSection
                      title="FAVORITES"
                      icon={<Star className="h-3.5 w-3.5" />}
                    >
                      {pinnedNotes.map((note) => (
                        <NoteTreeItem
                          key={note.id}
                          note={{
                            id: note.id,
                            title: note.title,
                            isPinned: true,
                          }}
                          isActive={activeNoteId === note.id}
                          onClick={() => handleNoteClick(note.id)}
                          onDelete={(e) => handleDeleteClick(e, note.id)}
                          onPin={() => handlePinNote(note.id)}
                        />
                      ))}
                    </SidebarSection>
                  )}

                  {/* Recent Notes Section */}
                  <SidebarSection
                    title="RECENT"
                    icon={<History className="h-3.5 w-3.5" />}
                  >
                    {recentNotes.map((note) => (
                      <NoteTreeItem
                        key={note.id}
                        note={{
                          id: note.id,
                          title: note.title,
                          lastModified: note.lastModified,
                        }}
                        isActive={activeNoteId === note.id}
                        onClick={() => handleNoteClick(note.id)}
                        onDelete={(e) => handleDeleteClick(e, note.id)}
                        onPin={() => handlePinNote(note.id)}
                      />
                    ))}
                  </SidebarSection>

                  {/* File Tree */}
                  <SidebarSection
                    title="FILES"
                    icon={<FileText className="h-3.5 w-3.5" />}
                    defaultOpen
                  >
                    {renderTree(notesTree.root.children)}
                  </SidebarSection>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredNotes.length > 0 ? (
                    <>
                      <div className="text-xs font-medium text-muted-foreground p-2">
                        SEARCH RESULTS ({filteredNotes.length})
                      </div>
                      {filteredNotes.map((note) => (
                        <NoteTreeItem
                          key={note.id}
                          note={{
                            id: note.id,
                            title: note.title,
                          }}
                          isActive={activeNoteId === note.id}
                          onClick={() => handleNoteClick(note.id)}
                          onDelete={(e) => handleDeleteClick(e, note.id)}
                          onPin={() => handlePinNote(note.id)}
                          highlightText={searchQuery}
                        />
                      ))}
                    </>
                  ) : searchQuery ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No notes found
                    </div>
                  ) : (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      Type to search
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </div>
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

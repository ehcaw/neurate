"use client";

import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText, Star, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NoteItemProps {
  id: string;
  title: string;
  isModified?: boolean;
  isPinned?: boolean;
  lastModified?: Date;
}

interface NoteTreeItemProps {
  note: NoteItemProps;
  isActive: boolean;
  onClick: () => void;
  onDelete: (e: MouseEvent) => void;
  onPin: () => void;
  highlightText?: string;
}

export function NoteTreeItem({
  note,
  isActive,
  onClick,
  onDelete,
  onPin,
  highlightText,
}: NoteTreeItemProps) {
  const formatDate = (date?: Date) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date);
  };

  // Highlight matching text if search is active
  const highlightTitle = (title: string, query?: string) => {
    if (!query) return title;

    const regex = new RegExp(`(${query})`, "gi");
    const parts = title.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-yellow-200 dark:bg-yellow-800">
          {part}
        </span>
      ) : (
        part
      ),
    );
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={cn(
            "group flex items-center justify-between rounded-md px-2 py-1.5 text-sm",
            isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted",
          )}
        >
          <button
            className="flex items-center gap-2 truncate flex-1 text-left"
            onClick={onClick}
          >
            <div className="relative">
              <FileText className="h-4 w-4 shrink-0 opacity-70" />
              {note.isModified && (
                <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-500" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="truncate">
                {highlightText
                  ? highlightTitle(note.title || "Untitled", highlightText)
                  : note.title || "Untitled"}
              </span>
              {note.lastModified && (
                <span className="text-xs text-muted-foreground">
                  {formatDate(note.lastModified)}
                </span>
              )}
            </div>
          </button>
          <div className="flex">
            {note.isPinned && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={onPin}
                    >
                      <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Pinned</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onClick}>Open</ContextMenuItem>
        <ContextMenuItem onClick={onPin}>
          {note.isPinned ? "Unpin" : "Pin"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>Rename</ContextMenuItem>
        <ContextMenuItem>Duplicate</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="text-red-500" onClick={onDelete}>
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

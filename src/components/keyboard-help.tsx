"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

export function KeyboardHelp() {
  const [open, setOpen] = useState(false);
  const isMac =
    typeof navigator !== "undefined" &&
    /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
  const modKey = isMac ? "⌘" : "Ctrl";

  const shortcuts = [
    { keys: `${modKey}+P`, description: "Open command menu" },
    { keys: `${modKey}+B`, description: "Toggle sidebar" },
    { keys: `${modKey}+E`, description: "Toggle preview mode" },
    { keys: `${modKey}+N`, description: "Create new note" },
    { keys: `${modKey}+S`, description: "Save current note" },
    { keys: `${modKey}+J`, description: "Go to next note" },
    { keys: `${modKey}+K`, description: "Go to previous note" },
    { keys: "Alt+1", description: "Focus sidebar" },
    { keys: "Alt+2", description: "Focus editor" },
    { keys: "Escape", description: "Close dialogs/menus" },
    { keys: `${modKey}+/`, description: "Show keyboard shortcuts" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Keyboard shortcuts"
        >
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {shortcut.description}
                </span>
                <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

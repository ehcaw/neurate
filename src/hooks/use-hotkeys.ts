"use client";

import { useEffect, useRef } from "react";

interface Hotkey {
  keys: string;
  callback: (e: KeyboardEvent) => void;
  preventDefault?: boolean;
}

export function useHotkeys(hotkeys: Hotkey[]) {
  // Use a ref to ensure we're always using the latest hotkeys
  const hotkeysRef = useRef<Hotkey[]>(hotkeys);

  useEffect(() => {
    hotkeysRef.current = hotkeys;
  }, [hotkeys]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Replace 'mod' with the appropriate key based on the platform
      const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
      const modKey = isMac ? "metaKey" : "ctrlKey";

      for (const hotkey of hotkeysRef.current) {
        const keys = hotkey.keys.split("+");

        // Check for modifier keys
        const needsCtrl =
          keys.includes("ctrl") || (keys.includes("mod") && !isMac);
        const needsShift = keys.includes("shift");
        const needsAlt = keys.includes("alt");
        const needsMeta =
          keys.includes("meta") || (keys.includes("mod") && isMac);

        // If any required modifier is not pressed, skip this hotkey
        if (
          (needsCtrl && !e.ctrlKey) ||
          (needsShift && !e.shiftKey) ||
          (needsAlt && !e.altKey) ||
          (needsMeta && !e.metaKey)
        ) {
          continue;
        }

        // Get the main key (last one in the combination)
        const mainKey = keys[keys.length - 1].toLowerCase();
        if (mainKey === "mod") continue; // Skip if only modifier

        const pressedKey = e.key.toLowerCase();

        if (mainKey === pressedKey) {
          if (hotkey.preventDefault !== false) {
            e.preventDefault();
          }
          hotkey.callback(e);
          break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []); // Empty dependency array since we use ref
}

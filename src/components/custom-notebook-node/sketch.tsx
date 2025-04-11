import React, { useEffect, useState, useCallback, useMemo } from "react"; // Import useMemo
import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import dynamic from "next/dynamic";
import debounce from "lodash.debounce"; // Import debounce
import { DrawingData } from "@/lib/types";

const KonvaCanvas = dynamic(() => import("./konva-components"), {
  ssr: false,
});

const SketchPadImpl: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
}) => {
  const width = node.attrs.width || 1000;
  const height = node.attrs.height || 700;
  const [initialLines, setInitialLines] = useState<DrawingData[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    // ... (parsing logic remains the same as in Solution 1) ...
    try {
      const nodeLines = node.attrs.lines;
      let parsedLines: DrawingData[] = [];

      if (typeof nodeLines === "string") {
        try {
          parsedLines = JSON.parse(nodeLines);
          if (!Array.isArray(parsedLines)) {
            console.warn("Parsed lines is not an array, defaulting to empty.");
            parsedLines = [];
          }
        } catch (e) {
          console.error(
            "Failed to parse string lines:",
            e,
            "Input:",
            nodeLines,
          );
          parsedLines = [];
        }
      } else if (Array.isArray(nodeLines)) {
        parsedLines = nodeLines;
      } else {
        parsedLines = [];
      }
      setInitialLines((prevLines) => {
        if (JSON.stringify(prevLines) !== JSON.stringify(parsedLines)) {
          return parsedLines;
        }
        return prevLines;
      });
    } catch (error) {
      console.error("Error processing lines from node:", error);
      setInitialLines([]);
    }
  }, [node.attrs.lines, isMounted]);

  // Create a debounced version of updateAttributes
  const debouncedUpdateAttributes = useMemo(() => {
    return debounce((lines: DrawingData[]) => {
      // Check if mounted before performing the actual update
      if (isMounted) {
        console.log("Debounced update running..."); // For debugging
        updateAttributes({ lines });
      }
    }, 300); // Adjust debounce delay (in ms) as needed
  }, [updateAttributes, isMounted]); // Recreate if updateAttributes or isMounted changes

  // Cleanup the debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedUpdateAttributes.cancel(); // Prevent delayed updates after unmount
    };
  }, [debouncedUpdateAttributes]);

  // Use the debounced function in the handler
  const handleDrawingChange = useCallback(
    (newLines: DrawingData[]) => {
      console.log("Change detected, invoking debounced update..."); // For debugging
      debouncedUpdateAttributes(newLines);
    },
    [debouncedUpdateAttributes],
  ); // Dependency is the debounced function

  if (!isMounted) {
    return null;
  }

  return (
    <NodeViewWrapper
      className={`sketch-node ${selected ? "ProseMirror-selectednode" : ""}`}
      data-drag-handle
    >
      <div
        style={{
          width,
          height,
          border: selected ? "2px solid blue" : "1px solid #ccc",
          borderRadius: "4px",
          margin: "1em 0",
          position: "relative", // Needed if debug display uses absolute positioning
          userSelect: "none", // Prevent text selection interfering with drawing
        }}
        contentEditable={false} // Prevent editor interaction inside
      >
        {/* Add a debug display */}
        <div
          style={{
            fontSize: "10px",
            color: "#888",
            padding: "2px",
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 1,
            background: "rgba(255,255,255,0.7)",
          }}
        >
          Lines: {initialLines?.length || 0} (Attr Type:{" "}
          {typeof node.attrs.lines}) Sel: {selected ? "Y" : "N"}
        </div>
        <KonvaCanvas
          width={width}
          height={height}
          initialLines={initialLines}
          onChange={handleDrawingChange}
        />
      </div>
    </NodeViewWrapper>
  );
};

export default SketchPadImpl;

import React, { useEffect, useState } from "react";
import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import dynamic from "next/dynamic";
import { DrawingData } from "@/lib/types";

const KonvaCanvas = dynamic(() => import("./konva-components"), {
  ssr: false,
});

// Now extending from NodeViewProps
const SketchPadImpl: React.FC<NodeViewProps> = ({ node, updateAttributes }) => {
  // Safely access attributes with defaults
  const width = node.attrs.width || 1000;
  const height = node.attrs.height || 700;
  //const lines = node.attrs.lines || [];
  const [initialLines, setInitialLines] = useState<DrawingData[]>([]);

  useEffect(() => {
    try {
      const nodeLines = node.attrs.lines;

      // Check if nodeLines is a string that needs parsing
      if (typeof nodeLines === "string") {
        try {
          const parsedLines = JSON.parse(nodeLines);
          setInitialLines(parsedLines);
        } catch (e) {
          console.error("Failed to parse string lines:", e);
        }
      }
      // Check if it's already an array
      else if (Array.isArray(nodeLines)) {
        setInitialLines(nodeLines);
      }
      // Otherwise, initialize empty
      else {
        setInitialLines([]);
      }
    } catch (error) {
      console.error("Error processing lines from node:", error);
      setInitialLines([]);
    }
  }, [node]);

  const handleDrawingChange = (newLines: any[]) => {
    updateAttributes({ lines: newLines });
  };

  return (
    <NodeViewWrapper className="sketch-node">
      <div
        style={{
          width,
          height,
          border: "1px solid #ccc",
          borderRadius: "4px",
          margin: "1em 0",
        }}
      >
        {/* Add a debug display */}
        <div style={{ fontSize: "10px", color: "#888", padding: "2px" }}>
          Lines count: {initialLines?.length || 0}
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

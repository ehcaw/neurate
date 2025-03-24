import React from "react";
import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import dynamic from "next/dynamic";

const KonvaCanvas = dynamic(() => import("./konva-components"), {
  ssr: false,
});

// Now extending from NodeViewProps
const SketchPadImpl: React.FC<NodeViewProps> = ({ node, updateAttributes }) => {
  // Safely access attributes with defaults
  console.log(node.attrs);
  const width = node.attrs.width || 1000;
  const height = node.attrs.height || 700;
  const lines = node.attrs.lines || [];

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
        <KonvaCanvas
          width={width}
          height={height}
          lines={lines}
          onChange={handleDrawingChange}
        />
      </div>
    </NodeViewWrapper>
  );
};

export default SketchPadImpl;

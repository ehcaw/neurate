import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Line } from "react-konva";
import Konva from "konva";

interface Line {
  tool: "brush" | "eraser";
  points: number[];
}

interface KonvaCanvasProps {
  width: number;
  height: number;
  lines: Line[];
  onChange: (lines: Line[]) => void;
}

const KonvaCanvas: React.FC<KonvaCanvasProps> = ({
  width,
  height,
  lines: initialLines,
  onChange,
}) => {
  const [lines, setLines] = useState<Line[]>(initialLines);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const isDrawing = useRef(false);

  // Update parent when lines change
  useEffect(() => {
    onChange(lines);
    console.log(lines);
  }, [lines, onChange]);

  const handleMouseDown = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    isDrawing.current = true;
    const pos = e.target.getStage()?.getPointerPosition();
    if (pos) {
      setLines([...lines, { tool, points: [pos.x, pos.y] }]);
    }
  };

  const handleMouseMove = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    if (!isDrawing.current) return;

    const point = e.target.getStage()?.getPointerPosition();
    if (!point) return;

    const newLines = [...lines];
    const lastLine = newLines[newLines.length - 1];
    lastLine.points = lastLine.points.concat([point.x, point.y]);

    setLines(newLines);
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  return (
    <div>
      <div style={{ padding: "5px", borderBottom: "1px solid #eee" }}>
        <select
          value={tool}
          onChange={(e) => setTool(e.target.value as "brush" | "eraser")}
          style={{ marginRight: "10px" }}
        >
          <option value="brush">Brush</option>
          <option value="eraser">Eraser</option>
        </select>
        <button onClick={() => setLines([])}>Clear</button>
      </div>

      <Stage
        width={width}
        height={height - 40}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        <Layer>
          {lines.map((line, i) => (
            <Line
              key={i}
              points={line.points}
              stroke="#df4b26"
              strokeWidth={5}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation={
                line.tool === "eraser" ? "destination-out" : "source-over"
              }
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

export default KonvaCanvas;

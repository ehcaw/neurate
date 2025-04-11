import {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Stage, Layer, Line } from "react-konva";
import type Konva from "konva";
import type {
  FreenotePageContent,
  Note,
  StandaloneRichSketchpadProps,
} from "@/lib/types";
import {
  Pencil,
  Type,
  Eraser,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Palette,
  Minus,
  Plus,
  FilePlus,
} from "lucide-react";
import { Input } from "../ui/input";
import { invoke } from "@tauri-apps/api/core";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";

// Import ReactQuill dynamically to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

export const RichSketchpadImpl = forwardRef<any, StandaloneRichSketchpadProps>(
  ({ note, width = 1000, height = 700, updateNote }, ref) => {
    // Track the current page index
    const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

    // Get all pages from the note
    const pages = useMemo(() => {
      if (!note || !note.pages || !Array.isArray(note.pages)) {
        // Create a default first page if note has no pages
        return [
          {
            id: `page-${Date.now()}`,
            lines: [],
            content: "<p>Start typing here...</p>",
            created_at: new Date().toISOString(),
            last_modified: new Date().toISOString(),
          },
        ];
      }

      // Ensure each page has a lines array
      return note.pages.map((page) => ({
        ...page,
        lines: (page as any).lines || [],
      })) as FreenotePageContent[];
    }, [note]);

    // Get the current page content based on index
    const getCurrentPageContent = (): FreenotePageContent => {
      if (pages && pages.length > currentPageIndex) {
        const page = pages[currentPageIndex];
        return {
          id: page.id,
          lines: page.lines || [], // Ensure lines is always an array
          content: page.content || "<p>Start typing here...</p>",
          created_at: page.created_at,
          last_modified: page.last_modified,
        };
      }

      // Return default content if no valid page exists
      return {
        id: `page-${Date.now()}`,
        lines: [], // Initialize an empty array
        content: "<p>Start typing here...</p>",
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
      };
    };

    // Local state for the active page content
    const [pageContent, setPageContent] = useState<FreenotePageContent>(
      getCurrentPageContent(),
    );

    const isQuillUpdating = useRef(false);
    const quillModules = useMemo(
      () => ({
        toolbar: [
          [{ header: [1, 2, false] }],
          ["bold", "italic", "underline"],
          [{ color: [] }, { background: [] }],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "image"],
          ["clean"],
        ],
      }),
      [],
    );

    // Update page content when the current page index changes
    useEffect(() => {
      setPageContent(getCurrentPageContent());
    }, [currentPageIndex, note]);

    // Other state variables
    const [tool, setTool] = useState<"brush" | "eraser" | "select">("select");
    const [color, setColor] = useState<string>("#3b82f6");
    const [strokeWidth, setStrokeWidth] = useState<number>(5);
    const [isDrawing, setIsDrawing] = useState(false);
    const [localTitle, setLocalTitle] = useState<string>(
      note?.title || "Untitled",
    );

    // References
    const stageRef = useRef<Konva.Stage>(null);
    const quillRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Toggle sidebar visibility
    const [sidebarVisible, setSidebarVisible] = useState<boolean>(true);

    // Available colors
    const colorOptions = [
      "#3b82f6", // Blue
      "#ef4444", // Red
      "#10b981", // Green
      "#f59e0b", // Yellow
      "#8b5cf6", // Purple
      "#ec4899", // Pink
      "#000000", // Black
    ];

    // Save page content to note
    const savePageContent = () => {
      if (!note) return;

      const updatedPages = [...pages];
      updatedPages[currentPageIndex] = {
        ...pageContent,
        last_modified: new Date().toISOString(),
      };

      updateNote(note.id, { pages: updatedPages });
    };

    // Add a new page
    const addNewPage = () => {
      if (!note) return;

      const newPage: FreenotePageContent = {
        id: `page-${Date.now()}`,
        lines: [],
        content: "<p>Start typing here...</p>", // Default new page content
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
      };

      const updatedPages = [...pages, newPage];

      // --- Backend Call ---
      // Invoke Rust backend to save the updated pages array
      invoke("update_freenote_content", {
        path: note.id,
        pageId: newPage.id,
        content: newPage.content,
        lines: newPage.lines,
      })
        .then(() => {
          console.log("New page added successfully in backend.");
          // Update parent state AFTER successful backend save
          updateNote(note.id, { pages: updatedPages });
          // Navigate to the new page AFTER parent state is likely updated
          setCurrentPageIndex(updatedPages.length - 1);
        })
        .catch((error) => {
          console.error("Failed to add new page in backend:", error);
          // Handle error (e.g., don't navigate, show error message)
        });
    };

    const saveCurrentPageToNote = useCallback(
      (currentContent: FreenotePageContent) => {
        if (!note) return;

        // 1. Create the updated pages array
        const updatedPages = pages.map((p, index) =>
          index === currentPageIndex
            ? { ...currentContent, last_modified: new Date().toISOString() } // Update last_modified for the current page
            : p,
        );

        // 2. Construct the *entire* new Note object
        const updatedNoteObject: Note = {
          ...note, // Copy id, title, etc.
          pages: updatedPages, // Set the updated pages
          metadata: {
            ...note.metadata,
            last_accessed: new Date().toISOString(), // Update last_accessed timestamp for the whole note
          },
        };

        // 3. Stringify the entire Note object
        const noteJson = JSON.stringify(updatedNoteObject);
        console.log(noteJson);

        const currentPage = updatedNoteObject["pages"][
          currentPageIndex
        ] as FreenotePageContent;
        // 4. --- Backend Call ---
        // Invoke Rust backend to save the full updated note JSON string
        invoke("update_freenote_content", {
          path: note.id,
          pageId: pages[currentPageIndex].id,
          content: currentPage.content,
          lines: JSON.stringify(currentPage.lines),
        })
          .then(() => {
            console.log(
              "Note content updated successfully in backend (sent full object).",
            );
            // Update parent state with the complete updated note object AFTER successful backend save
            updateNote(note.id, updatedNoteObject);
          })
          .catch((error) => {
            console.error("Failed to update note content in backend:", error);
            // Handle error appropriately
          });
      },
      [note, pages, currentPageIndex, updateNote], // Dependencies
    );

    const debouncedSave = useMemo(
      () => debounce(saveCurrentPageToNote, 500), // Adjust debounce delay as needed
      [saveCurrentPageToNote],
    );

    // Effect to add custom styles for Quill
    useEffect(() => {
      if (typeof window === "undefined") return;

      // Add custom styles for ReactQuill
      const style = document.createElement("style");
      style.innerHTML = `
        /* ReactQuill CSS fixes */
        .ql-toolbar.ql-snow {
          border: 1px solid #e5e7eb;
          border-radius: 4px 4px 0 0;
          background-color: #f9fafb;
        }
        .ql-container.ql-snow {
          border: none;
          font-family: inherit;
          height: calc(100% - 42px); /* Adjust for toolbar height */
        }
        .ql-editor {
          padding: 16px;
          min-height: 200px;
          height: 100%;
        }
        /* Custom styles for the rich sketchpad */
        .rich-sketchpad .quill {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
      `;
      document.head.appendChild(style);

      return () => {
        // No need to clean up styles as they might be used by other instances
      };
    }, []);

    // Update local state when page or note changes
    useEffect(() => {
      const currentPageData = getCurrentPageContent();
      setPageContent(currentPageData);
      isQuillUpdating.current = true; // Prevent onChange from firing during this update

      // ReactQuill will handle the content update through its value prop
      setTimeout(() => {
        isQuillUpdating.current = false;
      }, 0);
    }, [currentPageIndex, note]); // Re-run when page index or note changes

    // Handle ReactQuill content changes
    const handleQuillChange = useCallback(
      (content: string) => {
        if (isQuillUpdating.current) return;

        console.log("QuillChange - content changed");
        isQuillUpdating.current = true;

        // Update local state
        const updatedPageData = { ...pageContent, content };
        console.log(updatedPageData);
        setPageContent(updatedPageData);

        // Save to backend (debounced)
        debouncedSave(updatedPageData);

        isQuillUpdating.current = false;
      },
      [pageContent, debouncedSave],
    );
    // Drawing handlers
    const handleMouseDown = (
      e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
    ) => {
      // Only draw if a drawing tool is active
      if (tool !== "brush" && tool !== "eraser") return;

      setIsDrawing(true);
      const pos = e.target.getStage()?.getPointerPosition();

      if (pos) {
        const newLine = {
          tool,
          points: [pos.x, pos.y],
          color: tool === "brush" ? color : undefined, // Eraser doesn't need color
          width: tool === "brush" ? strokeWidth : 10, // Use state for brush, fixed for eraser
        };

        // Update the page content with the new line
        setPageContent((prev) => ({
          ...prev,
          lines: [...(prev.lines || []), newLine],
          last_modified: new Date().toISOString(),
        }));
      }
    };

    const handleMouseMove = (
      e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
    ) => {
      if (!isDrawing || (tool !== "brush" && tool !== "eraser")) return;

      const stage = e.target.getStage();
      const point = stage?.getPointerPosition();
      if (!point) return;

      setPageContent((prev) => {
        const newLines = [...prev.lines];
        const lastLine = newLines[newLines.length - 1];
        if (lastLine) {
          lastLine.points = lastLine.points.concat([point.x, point.y]);
          return {
            ...prev,
            lines: newLines,
            last_modified: new Date().toISOString(),
          };
        }
        return prev; // Should not happen if isDrawing is true, but good practice
      });
    };

    const handleMouseUp = () => {
      if (isDrawing) {
        setIsDrawing(false);
        // Save the page content after completing a drawing action
        savePageContent();
      }
    };

    // Clear drawing
    const handleClearDrawing = () => {
      if (
        window.confirm(
          "Are you sure you want to clear all drawings on this page?",
        )
      ) {
        setPageContent((prev) => ({
          ...prev,
          lines: [],
          last_modified: new Date().toISOString(),
        }));
        savePageContent();
      }
    };

    // Toggle sidebar visibility
    const toggleSidebar = () => {
      setSidebarVisible(!sidebarVisible);
    };

    useImperativeHandle(ref, () => ({
      clearDrawing: handleClearDrawing,
      toggleSidebar: toggleSidebar,
      getContent: () => {
        console.log(pageContent);
        return pageContent;
      },
      saveUpdates: () => {
        saveCurrentPageToNote(pageContent);
      },
      focusEditor: () => {
        if (quillRef.current && tool === "select") {
          quillRef.current.focus();
        }
      },
    }));

    return (
      <div
        className="rich-sketchpad"
        style={{
          position: "relative",
          width,
          height,
          display: "flex",
          overflow: "auto",
          fontFamily: "Inter, system-ui, sans-serif",
          borderRadius: "8px",
          boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        }}
      >
        {/* Main Canvas Area */}
        <div
          style={{
            flexGrow: 1,
            height: "100%",
            position: "relative",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            transition: "width 0.3s ease",
            backgroundColor: "#ffffff",
            overflow: "auto",
            display: "flex",
            flexDirection: "column", // Changed to column to accommodate page navigation
          }}
        >
          {/* Top Toolbar */}
          <div
            className="top-toolbar"
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 16px",
              borderBottom: "1px solid #e5e7eb",
              backgroundColor: "#f9fafb",
              height: "56px",
              flexShrink: 0, // Prevent shrinking
            }}
          >
            {/* Title input that stretches to fill available space */}
            <div className="flex-1 mr-4">
              <Input
                type="text"
                value={localTitle}
                onChange={(e) => {
                  setLocalTitle(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    updateNote(note.id, { title: localTitle });
                    console.log(note.id);
                    invoke("update_title", {
                      path: note.id,
                      newTitle: localTitle,
                    });
                    e.currentTarget.blur();
                  }
                }}
                onBlur={(e) => {
                  // Also update when the input loses focus (user clicks elsewhere)
                  if (localTitle !== note.title) {
                    updateNote(note.id, { title: localTitle });
                    invoke("update_title", {
                      path: note.id,
                      newTitle: localTitle,
                    });
                  }
                }}
                placeholder="Untitled"
                className="w-full bg-transparent border-none outline-none text-lg font-medium"
              />
            </div>

            {/* Toggle Sidebar Button positioned at the end */}
            <button
              onClick={toggleSidebar}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px",
                borderRadius: "4px",
                backgroundColor: "#f3f4f6",
                border: "none",
                cursor: "pointer",
                transition: "background-color 0.2s ease",
                flexShrink: 0, // Prevent button from shrinking
              }}
              aria-label={sidebarVisible ? "Hide Tools" : "Show Tools"}
              title={sidebarVisible ? "Hide Tools" : "Show Tools"}
            >
              {sidebarVisible ? (
                <ChevronRight size={18} />
              ) : (
                <ChevronLeft size={18} />
              )}
            </button>
          </div>

          {/* Page Navigation Bar */}
          <div
            className="page-navigation"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 16px",
              borderBottom: "1px solid #e5e7eb",
              backgroundColor: "#f9fafb",
              height: "48px",
              flexShrink: 0, // Prevent shrinking
            }}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setCurrentPageIndex(Math.max(0, currentPageIndex - 1))
                }
                disabled={currentPageIndex === 0}
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  backgroundColor:
                    currentPageIndex === 0 ? "#f3f4f6" : "#e5e7eb",
                  border: "none",
                  cursor: currentPageIndex === 0 ? "not-allowed" : "pointer",
                  opacity: currentPageIndex === 0 ? 0.5 : 1,
                }}
              >
                <ChevronLeft size={16} />
              </button>

              <span style={{ fontSize: "14px" }}>
                Page {currentPageIndex + 1} of {pages.length}
              </span>

              <button
                onClick={() =>
                  setCurrentPageIndex(
                    Math.min(pages.length - 1, currentPageIndex + 1),
                  )
                }
                disabled={currentPageIndex === pages.length - 1}
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  backgroundColor:
                    currentPageIndex === pages.length - 1
                      ? "#f3f4f6"
                      : "#e5e7eb",
                  border: "none",
                  cursor:
                    currentPageIndex === pages.length - 1
                      ? "not-allowed"
                      : "pointer",
                  opacity: currentPageIndex === pages.length - 1 ? 0.5 : 1,
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={addNewPage}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "4px",
                backgroundColor: "#e5e7eb",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              <FilePlus size={16} />
              Add Page
            </button>
          </div>

          {/* Layer Container */}
          <div
            style={{
              position: "relative", // Establishes stacking context
              width: "100%",
              height: "calc(100% - 104px)", // Adjust for top toolbar + page navigation
              overflow: "hidden", // Prevent content overflow
              flexGrow: 1, // Allow to expand to fill available space
            }}
            ref={containerRef}
          >
            {/* Text Editor Layer (Bottom) with ReactQuill */}
            <div
              className="text-layer"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                zIndex: 1, // Lower z-index
                padding: "8px", // Add some padding
                boxSizing: "border-box", // Include padding in the width/height calculation
              }}
            >
              <ReactQuill
                value={pageContent.content}
                onChange={handleQuillChange}
                modules={quillModules}
                placeholder="Start typing here..."
                theme="snow"
                style={{
                  height: "100%",
                  backgroundColor: "#ffffff",
                  borderRadius: "4px",
                  pointerEvents: tool === "select" ? "auto" : "none",
                }}
              />
            </div>

            {/* Drawing Canvas Layer (Top) */}
            <Stage
              ref={stageRef}
              // Calculate width based on sidebar visibility
              width={
                containerRef.current?.clientWidth ||
                width - (sidebarVisible ? 300 : 0)
              }
              height={containerRef.current?.clientHeight || height - 104}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 10, // Higher z-index, appears on top
                // If a drawing tool is selected, capture events. Otherwise, let them pass through.
                pointerEvents:
                  tool === "brush" || tool === "eraser" ? "auto" : "none",
                cursor:
                  tool === "brush"
                    ? "crosshair"
                    : tool === "eraser"
                      ? "cell" // Or a custom eraser cursor
                      : "default", // Or 'auto' to inherit from text layer?
              }}
            >
              <Layer>
                {/* Render drawing lines */}
                {pageContent.lines.map((line, i) => (
                  <Line
                    key={i}
                    points={line.points}
                    stroke={line.color || "#000000"} // Default stroke for eraser shouldn't matter due to blend mode
                    strokeWidth={line.width || 5}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation={
                      // Eraser uses destination-out to 'erase'
                      line.tool === "eraser" ? "destination-out" : "source-over"
                    }
                  />
                ))}
              </Layer>
            </Stage>
          </div>
        </div>

        {/* Sidebar */}
        {sidebarVisible && (
          <div
            className="rich-sketchpad-sidebar"
            style={{
              width: "300px",
              height: "100%",
              borderLeft: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
              overflowY: "auto",
              transition: "all 0.3s ease",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Rest of the sidebar code remains the same */}
            <div
              className="sidebar-header"
              style={{
                padding: "16px",
                borderBottom: "1px solid #e5e7eb",
                backgroundColor: "#f9fafb",
                height: "56px", // Match top toolbar height
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0, // Prevent shrinking
              }}
            >
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
                Freenote Tools
              </h3>
            </div>

            {/* Drawing Tools Content */}
            <div
              style={{
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "24px",
                flexGrow: 1, // Allow this section to grow and push button down
                overflowY: "auto", // Allow scrolling if tools exceed height
              }}
            >
              {/* Tool Selection Section */}
              <div className="tool-section">
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#4b5563",
                  }}
                >
                  Tool Selection
                </h4>
                <div style={{ display: "flex", gap: "8px" }}>
                  {/* Brush Button */}
                  <button
                    onClick={() => setTool("brush")}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                      padding: "12px",
                      borderRadius: "6px",
                      border:
                        tool === "brush"
                          ? "2px solid #3b82f6"
                          : "1px solid #e5e7eb",
                      backgroundColor: tool === "brush" ? "#eff6ff" : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      outlineOffset: "2px",
                    }}
                    aria-pressed={tool === "brush"}
                    title="Select Brush Tool"
                  >
                    <Pencil
                      size={20}
                      color={tool === "brush" ? "#3b82f6" : "#6b7280"}
                    />
                    <span
                      style={{
                        fontSize: "14px",
                        color: tool === "brush" ? "#3b82f6" : "#4b5563",
                      }}
                    >
                      Brush
                    </span>
                  </button>
                  {/* Eraser Button */}
                  <button
                    onClick={() => setTool("eraser")}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                      padding: "12px",
                      borderRadius: "6px",
                      border:
                        tool === "eraser"
                          ? "2px solid #3b82f6"
                          : "1px solid #e5e7eb",
                      backgroundColor:
                        tool === "eraser" ? "#eff6ff" : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      outlineOffset: "2px",
                    }}
                    aria-pressed={tool === "eraser"}
                    title="Select Eraser Tool"
                  >
                    <Eraser
                      size={20}
                      color={tool === "eraser" ? "#3b82f6" : "#6b7280"}
                    />
                    <span
                      style={{
                        fontSize: "14px",
                        color: tool === "eraser" ? "#3b82f6" : "#4b5563",
                      }}
                    >
                      Eraser
                    </span>
                  </button>
                  {/* Text Tool Button */}
                  <button
                    onClick={() => {
                      setTool("select");
                      // Focus the ReactQuill editor with a small delay to ensure it's ready
                      setTimeout(() => {
                        if (quillRef.current) {
                          quillRef.current.focus();
                        }
                      }, 100);
                    }}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                      padding: "12px",
                      borderRadius: "6px",
                      border:
                        tool === "select"
                          ? "2px solid #3b82f6"
                          : "1px solid #e5e7eb",
                      backgroundColor:
                        tool === "select" ? "#eff6ff" : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      outlineOffset: "2px",
                    }}
                    aria-pressed={tool === "select"}
                    title="Select Text / Objects"
                  >
                    <Type
                      size={20}
                      color={tool === "select" ? "#3b82f6" : "#6b7280"}
                    />
                    <span
                      style={{
                        fontSize: "14px",
                        color: tool === "select" ? "#3b82f6" : "#4b5563",
                      }}
                    >
                      Text
                    </span>
                  </button>
                </div>
              </div>

              {/* Color Selection (Only shown for Brush) */}
              {tool === "brush" && (
                <div className="tool-section">
                  <h4
                    style={{
                      margin: "0 0 12px 0",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#4b5563",
                    }}
                  >
                    Color
                  </h4>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                  >
                    {colorOptions.map((colorOption) => (
                      <button
                        key={colorOption}
                        onClick={() => setColor(colorOption)}
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          backgroundColor: colorOption,
                          border:
                            color === colorOption
                              ? "2px solid #000" // Highlight selected color
                              : "1px solid #d1d5db", // Subtle border for light colors
                          cursor: "pointer",
                          transition: "transform 0.1s ease",
                          transform:
                            color === colorOption ? "scale(1.1)" : "scale(1)",
                          outline: "none",
                        }}
                        aria-label={`Select color ${colorOption}`}
                        title={colorOption}
                      />
                    ))}
                    {/* Custom Color Button */}
                    <button
                      onClick={() => {
                        // Trigger hidden color input
                        const input = document.getElementById(
                          "color-picker-input",
                        ) as HTMLInputElement;
                        if (input) input.click();
                      }}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        backgroundColor: "#ffffff",
                        border: "1px dashed #d1d5db",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "#6b7280",
                      }}
                      aria-label="Choose custom color"
                      title="Custom color"
                    >
                      <Palette size={18} />
                      {/* Hidden color input */}
                      <input
                        id="color-picker-input"
                        type="color"
                        value={color}
                        style={{
                          visibility: "hidden",
                          width: 0,
                          height: 0,
                          position: "absolute",
                        }}
                        onChange={(e) => setColor(e.target.value)}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Brush Size (Only shown for Brush) */}
              {tool === "brush" && (
                <div className="tool-section">
                  <h4
                    style={{
                      margin: "0 0 12px 0",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#4b5563",
                    }}
                  >
                    Brush Size
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <button
                      onClick={() =>
                        setStrokeWidth(Math.max(1, strokeWidth - 1))
                      }
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "4px",
                        border: "1px solid #e5e7eb",
                        backgroundColor: "#f9fafb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                      disabled={strokeWidth <= 1}
                      aria-label="Decrease brush size"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={strokeWidth}
                      onChange={(e) =>
                        setStrokeWidth(Number.parseInt(e.target.value))
                      }
                      style={{
                        flexGrow: 1,
                        cursor: "pointer",
                        accentColor: color,
                      }}
                      aria-label="Brush size slider"
                    />
                    <button
                      onClick={() =>
                        setStrokeWidth(Math.min(20, strokeWidth + 1))
                      }
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "4px",
                        border: "1px solid #e5e7eb",
                        backgroundColor: "#f9fafb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                      disabled={strokeWidth >= 20}
                      aria-label="Increase brush size"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div
                    style={{
                      textAlign: "center",
                      marginTop: "8px",
                      fontSize: "14px",
                      color: "#6b7280",
                    }}
                  >
                    {strokeWidth}px
                  </div>
                  {/* Preview circle */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      marginTop: "8px",
                      height: "30px",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: `${strokeWidth}px`,
                        height: `${strokeWidth}px`,
                        borderRadius: "50%",
                        backgroundColor: color,
                        minWidth: "2px",
                        minHeight: "2px",
                        transition: "width 0.1s ease, height 0.1s ease",
                      }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              )}

              {/* Pages Section */}
              <div className="tool-section">
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#4b5563",
                  }}
                >
                  Pages
                </h4>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {/* List of pages */}
                  <div
                    style={{
                      maxHeight: "200px",
                      overflowY: "auto",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                    }}
                  >
                    {(pages || []).map((page, index) => (
                      <button
                        key={page.id || index}
                        onClick={() => setCurrentPageIndex(index)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          width: "100%",
                          padding: "8px 12px",
                          backgroundColor:
                            currentPageIndex === index
                              ? "#eff6ff"
                              : "transparent",
                          border: "none",
                          borderBottom:
                            index < (pages || []).length - 1
                              ? "1px solid #e5e7eb"
                              : "none",
                          textAlign: "left",
                          cursor: "pointer",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: currentPageIndex === index ? 500 : 400,
                            color:
                              currentPageIndex === index
                                ? "#3b82f6"
                                : "#4b5563",
                          }}
                        >
                          Page {index + 1}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Add new page button */}
                  <button
                    onClick={addNewPage}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "8px 0",
                      backgroundColor: "#f3f4f6",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    <FilePlus size={16} />
                    Add New Page
                  </button>
                </div>
              </div>

              {/* Clear Drawings Button */}
              <button
                onClick={handleClearDrawing}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  marginTop: "auto",
                  backgroundColor: "#fee2e2",
                  color: "#b91c1c",
                  border: "1px solid #fecaca",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  fontWeight: 500,
                  width: "100%",
                }}
              >
                <Trash2 size={16} />
                Clear Current Page
              </button>
            </div>
          </div>
        )}
      </div>
    );
  },
);

// Helper function for debouncing

function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return function (this: ThisParameterType<T>, ...args: Parameters<T>): void {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

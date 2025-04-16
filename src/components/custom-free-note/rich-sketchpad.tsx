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
  Line as LineType, // Assuming Line type is defined in types
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
  Undo,
} from "lucide-react";
import { Input } from "../ui/input";
import { invoke } from "@tauri-apps/api/core";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";
import { notesStore } from "@/lib/context";
import {
  refreshNotes,
  refreshNotesTree,
  refreshRecentNotes,
} from "@/lib/utils";

// Import ReactQuill dynamically to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

// Helper function to parse and validate lines
const parseAndValidateLines = (
  rawLines: any,
  pageIdOrIndex: string | number,
): LineType[] => {
  let pageLines: LineType[] = [];

  if (typeof rawLines === "string") {
    try {
      const parsedLines = JSON.parse(rawLines);
      if (Array.isArray(parsedLines)) {
        // Validate structure of each line object
        pageLines = parsedLines
          .map((line: any, index: number) => {
            if (
              !line ||
              typeof line !== "object" ||
              !Array.isArray(line.points)
            ) {
              console.warn(
                `Invalid line structure at index ${index} for page ${pageIdOrIndex}`,
                line,
              );
              return null; // Filter out invalid lines
            }
            return {
              tool: line.tool === "eraser" ? "eraser" : "brush", // Default to brush
              points: line.points.filter(
                (p: any): p is number => typeof p === "number",
              ), // Ensure points are numbers
              color: typeof line.color === "string" ? line.color : undefined,
              width: typeof line.width === "number" ? line.width : 5,
            };
          })
          .filter((line): line is LineType => line !== null);
      } else {
        console.warn(
          `Parsed lines for page ${pageIdOrIndex} is not an array:`,
          parsedLines,
        );
      }
    } catch (error) {
      console.error(
        `Failed to parse lines JSON for page ${pageIdOrIndex}: "${rawLines}". Error:`,
        error,
      );
    }
  } else if (Array.isArray(rawLines)) {
    // Validate structure if it's already an array
    pageLines = rawLines
      .map((line: any, index: number) => {
        if (!line || typeof line !== "object" || !Array.isArray(line.points)) {
          console.warn(
            `Invalid line structure at index ${index} for page ${pageIdOrIndex}`,
            line,
          );
          return null; // Filter out invalid lines
        }
        return {
          tool: line.tool === "eraser" ? "eraser" : "brush",
          points: line.points.filter(
            (p: any): p is number => typeof p === "number",
          ),
          color: typeof line.color === "string" ? line.color : undefined,
          width: typeof line.width === "number" ? line.width : 5,
        };
      })
      .filter((line): line is LineType => line !== null);
  }
  // If rawLines is null/undefined/etc., or parsing/validation failed, pageLines remains []
  return pageLines;
};

export const RichSketchpadImpl = forwardRef<any, StandaloneRichSketchpadProps>(
  ({ note, width = 1000, height = 700, updateNote }, ref) => {
    // Track the current page index
    const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
    // Add history state for undo functionality (per page)
    const [pageHistory, setPageHistory] = useState<FreenotePageContent[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);
    const MAX_HISTORY_SIZE = 50; // Limit history size to prevent memory issues
    const { notes, setNotes, setNotesTree, setRecentNotes } = notesStore();

    // Get all pages from the note, ensuring lines are always a valid array
    const pages = useMemo(() => {
      const defaultPage: FreenotePageContent = {
        id: `page-${Date.now()}`,
        lines: [],
        content: "<p>Start typing here...</p>",
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
      };

      if (!note || !note.pages || !Array.isArray(note.pages)) {
        return [defaultPage];
      }

      return note.pages.map((page, index) => {
        const pageLines = parseAndValidateLines(
          (page as any).lines,
          page.id || index,
        );

        return {
          ...page,
          lines: pageLines, // Ensure lines is always an array in the memoized result
          content: page.content || "<p>Start typing here...</p>", // Ensure content exists
        };
      }) as FreenotePageContent[];
    }, [note]); // Dependency is correct

    // Get the current page content based on index (simplified using the robust `pages` memo)
    const getCurrentPageContent = useCallback((): FreenotePageContent => {
      if (pages && pages.length > currentPageIndex) {
        return pages[currentPageIndex];
      }

      // Return default content if no valid page exists
      return {
        id: `page-${Date.now()}`,
        lines: [],
        content: "<p>Start typing here...</p>",
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
      };
    }, [pages, currentPageIndex]);

    // Initialize pageContent state safely using initial note prop
    const [pageContent, setPageContent] = useState<FreenotePageContent>(() => {
      const defaultPage: FreenotePageContent = {
        id: `page-${Date.now()}-initial`, // Unique ID for default
        lines: [],
        content: "<p>Start typing here...</p>",
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
      };

      if (
        !note ||
        !note.pages ||
        !Array.isArray(note.pages) ||
        note.pages.length === 0
      ) {
        return defaultPage;
      }
      // Use page at index 0 for initial state
      const initialPageData = note.pages[0];
      console.log("initial page data ", initialPageData);
      if (!initialPageData) return defaultPage;
      console.log(
        "initial lines ",
        (initialPageData as FreenotePageContent).lines,
      );
      const initialLines = parseAndValidateLines(
        (initialPageData as any).lines,
        initialPageData.id || 0,
      );
      console.log("initial lines ", initialLines);

      const initialPage = {
        id: initialPageData.id,
        lines: initialLines,
        content: initialPageData.content || "<p>Start typing here...</p>",
        created_at: initialPageData.created_at,
        last_modified: initialPageData.last_modified,
      };

      // Initialize history with the initial state
      setTimeout(() => {
        setPageHistory([{ ...initialPage }]);
        setHistoryIndex(0);
      }, 0);

      return initialPage;
    });

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

    // Update page content when the current page index or the processed `pages` array changes
    useEffect(() => {
      const currentPageData = getCurrentPageContent(); // Relies on the robust 'pages' memo
      setPageContent(currentPageData);

      // Reset history when switching pages
      setPageHistory([{ ...currentPageData }]);
      setHistoryIndex(0);

      isQuillUpdating.current = true;
      // Use timeout to ensure Quill value prop updates before allowing onChange
      setTimeout(() => {
        if (quillRef.current && quillRef.current.getEditor()) {
          // Setting quill state directly might be needed if value prop isn't enough
          // quillRef.current.getEditor().setContents(quillRef.current.getEditor().clipboard.convert(currentPageData.content));
        }
        isQuillUpdating.current = false;
      }, 0);
    }, [currentPageIndex, pages, getCurrentPageContent]); // Use pages dependency

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

    // Add a new page
    const addNewPage = () => {
      if (!note) return;

      const newPage: FreenotePageContent = {
        id: `page-${Date.now()}`,
        lines: [],
        content: "<p>New page content...</p>", // Default new page content
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
      };

      const updatedPages = [...pages, newPage];

      // --- Backend Call ---
      // Invoke Rust backend to save the updated pages array
      // Send lines as an array (which backend should handle)
      invoke("update_freenote_content", {
        path: note.id,
        pageId: newPage.id,
        content: newPage.content,
        lines: newPage.lines, // Send as empty array
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

    // Save full note state to backend (debounced)
    const saveCurrentPageToNote = useCallback(
      (currentContent: FreenotePageContent) => {
        if (!note) return;

        // 1. Create the updated pages array using the robust 'pages' state
        const updatedPages = pages.map((p, index) =>
          index === currentPageIndex
            ? { ...currentContent, last_modified: new Date().toISOString() }
            : p,
        );

        // 2. Construct the *entire* new Note object
        const updatedNoteObject: Note = {
          ...note, // Copy id, title, etc.
          pages: updatedPages, // Set the updated pages (lines are arrays)
          metadata: {
            ...note.metadata,
            last_accessed: new Date().toISOString(),
          },
        };

        // Get the specific page data being saved
        const currentPageForBackend = updatedPages[currentPageIndex];
        if (!currentPageForBackend) {
          console.error("Cannot save: Current page data not found.");
          return;
        }

        // 4. --- Backend Call ---
        // Always send lines as stringified JSON for consistency
        invoke("update_freenote_content", {
          path: note.id,
          pageId: currentPageForBackend.id,
          content: currentPageForBackend.content,
          lines: JSON.stringify(currentPageForBackend.lines || []), // Ensure array before stringify
        })
          .then(() => {
            console.log(
              "Note content updated successfully in backend (sent full object).",
            );
            // Update parent state with the complete updated note object AFTER successful backend save
            // Make sure lines are arrays in the object passed to parent
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

    const handleUndo = useCallback(() => {
      // If there's history to go back to
      if (historyIndex > 0) {
        const previousState = pageHistory[historyIndex - 1];
        setHistoryIndex(historyIndex - 1);
        setPageContent(previousState);
        debouncedSave(previousState);
      }
    }, [historyIndex, pageHistory, debouncedSave]);

    // Effect to add custom styles for Quill (no changes needed here)
    useEffect(() => {
      // ... style injection code ...
    }, []);

    // Add keyboard event listener for undo functionality (Ctrl+Z or Cmd+Z)
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Handle Ctrl+Z or Cmd+Z (on Mac)
        if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
          e.preventDefault(); // Prevent browser's default undo
          handleUndo();
        }
      };

      // Add listener to the window
      window.addEventListener("keydown", handleKeyDown);

      // Clean up on unmount
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }, [handleUndo]);

    // Update local title state when note prop changes (e.g., initial load or external update)
    useEffect(() => {
      if (note?.title !== localTitle) {
        setLocalTitle(note?.title || "Untitled");
      }
      // Avoid dependency loop with localTitle
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [note?.title]);

    // Helper function to add state to history
    const addToHistory = useCallback(
      (state: FreenotePageContent) => {
        // Only add to history if it's different from the current state
        const lastHistoryState = pageHistory[historyIndex];
        const isDifferent =
          !lastHistoryState ||
          JSON.stringify(lastHistoryState) !== JSON.stringify(state);

        if (!isDifferent) return;

        // If we're not at the end of history, truncate future states
        const newHistory =
          historyIndex < pageHistory.length - 1
            ? pageHistory.slice(0, historyIndex + 1)
            : pageHistory;

        // Add the new state to history, limiting to MAX_HISTORY_SIZE
        const updatedHistory = [...newHistory, { ...state }];
        if (updatedHistory.length > MAX_HISTORY_SIZE) {
          updatedHistory.shift(); // Remove oldest state
        }

        setPageHistory(updatedHistory);
        setHistoryIndex(updatedHistory.length - 1);
      },
      [historyIndex, pageHistory],
    );

    // Handle ReactQuill content changes
    const handleQuillChange = useCallback(
      (content: string) => {
        if (isQuillUpdating.current) return;

        console.log("QuillChange - content changed");

        // First add current state to history
        addToHistory(pageContent);

        // Update local state (ensure lines is preserved correctly)
        const updatedPageData = { ...pageContent, content };
        setPageContent(updatedPageData); // This triggers re-render

        // Save to backend (debounced)
        debouncedSave(updatedPageData); // Pass the latest state
      },
      [pageContent, debouncedSave, addToHistory], // pageContent is needed to preserve other fields like lines
    );

    // Drawing handlers
    const handleMouseDown = (
      e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
    ) => {
      // Only draw if a drawing tool is active
      if (tool !== "brush" && tool !== "eraser") return;

      // Add current state to history before starting a new drawing action
      addToHistory(pageContent);

      setIsDrawing(true);
      const pos = e.target.getStage()?.getPointerPosition();

      if (pos) {
        const newLine: LineType = {
          tool,
          points: [pos.x, pos.y],
          color: tool === "brush" ? color : undefined, // Eraser doesn't need color
          width: tool === "brush" ? strokeWidth : 10, // Use state for brush, fixed for eraser
        };

        // Update the page content with the new line
        setPageContent((prev) => ({
          ...prev,
          // Ensure prev.lines is treated as an array
          lines: [...(Array.isArray(prev.lines) ? prev.lines : []), newLine],
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
        // Ensure prev.lines exists and is an array before spreading
        const currentLines = Array.isArray(prev.lines) ? prev.lines : [];
        if (currentLines.length === 0) return prev; // No lines to modify

        const newLines = [...currentLines]; // Safe spread
        const lastLine = newLines[newLines.length - 1];

        // Ensure lastLine and its points array exist before modifying
        if (lastLine && Array.isArray(lastLine.points)) {
          lastLine.points = lastLine.points.concat([point.x, point.y]);
          return {
            ...prev,
            lines: newLines,
            last_modified: new Date().toISOString(),
          };
        }
        // If no valid last line or points array, return previous state
        console.warn(
          "MouseMove: Could not find last line or points array to append to.",
        );
        return prev;
      });
    };

    const handleMouseUp = () => {
      if (isDrawing) {
        setIsDrawing(false);
        // Save the page content after completing a drawing action using debounced save
        // This ensures text edits and drawing edits use the same saving mechanism
        debouncedSave(pageContent);
      }
    };

    // Clear drawing
    const handleClearDrawing = () => {
      if (
        window.confirm(
          "Are you sure you want to clear all drawings on this page?",
        )
      ) {
        // Add current state to history before clearing
        addToHistory(pageContent);

        const clearedPageData = {
          ...pageContent,
          lines: [], // Set lines to empty array
          last_modified: new Date().toISOString(),
        };
        setPageContent(clearedPageData);
        // Save the cleared state
        debouncedSave(clearedPageData);
      }
    };

    // Toggle sidebar visibility
    const toggleSidebar = () => {
      setSidebarVisible(!sidebarVisible);
      // Recalculate stage size after sidebar toggles (might need a slight delay)
      setTimeout(() => {
        if (stageRef.current && containerRef.current) {
          stageRef.current.width(containerRef.current.clientWidth);
          stageRef.current.height(containerRef.current.clientHeight);
        }
      }, 310); // Slightly longer than transition duration
    };

    useImperativeHandle(ref, () => ({
      clearDrawing: handleClearDrawing,
      toggleSidebar: toggleSidebar,
      undo: handleUndo,
      getContent: () => {
        // Return the current state, ensuring lines is an array
        return {
          ...pageContent,
          lines: Array.isArray(pageContent.lines) ? pageContent.lines : [],
        };
      },
      saveUpdates: () => {},
      focusEditor: () => {
        if (quillRef.current && tool === "select") {
          quillRef.current.focus();
        }
      },
    }));

    // Debounce helper needs flush method for immediate save on demand
    // Modify the debounce function or use a library like lodash.debounce

    return (
      <div
        className="rich-sketchpad"
        style={{
          position: "relative",
          width,
          height,
          display: "flex",
          overflow: "hidden", // Changed from auto to hidden on main container
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
            borderRight: sidebarVisible ? "1px solid #e5e7eb" : "none", // Border moves with sidebar
            borderRadius: "8px 0 0 8px", // Adjusted radius
            transition: "width 0.3s ease",
            backgroundColor: "#ffffff",
            overflow: "hidden", // Changed from auto
            display: "flex",
            flexDirection: "column",
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
            {/* Title input that stretches */}
            <div className="flex-1 mr-4">
              <Input
                type="text"
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    // Call blur() immediately after preventing default and before any async operations
                    e.currentTarget.blur();

                    if (localTitle !== note?.title) {
                      updateNote(note.id, { title: localTitle });
                      invoke("update_title", {
                        path: note.id,
                        newTitle: localTitle,
                      }).catch((err) =>
                        console.error("Failed to update title:", err),
                      );
                      setNotes(await refreshNotes());
                      setNotesTree(await refreshNotesTree());
                      setRecentNotes(await refreshRecentNotes());
                    }
                  }
                }}
                onBlur={async () => {
                  // Update when the input loses focus if changed
                  if (note && localTitle !== note.title) {
                    updateNote(note.id, { title: localTitle });
                    invoke("update_title", {
                      path: note.id,
                      newTitle: localTitle,
                    }).catch((err) =>
                      console.error("Failed to update title:", err),
                    );
                    setNotes(await refreshNotes());
                    setNotesTree(await refreshNotesTree());
                    setRecentNotes(await refreshRecentNotes());
                  }
                }}
                placeholder="Untitled"
                className="w-full bg-transparent border-none outline-none focus:ring-0 text-lg font-medium" // Added focus:ring-0
              />
            </div>

            {/* Toggle Sidebar Button */}
            <button
              onClick={toggleSidebar}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px",
                borderRadius: "4px",
                backgroundColor: "#f3f4f6",
                border: "1px solid #e5e7eb", // Added border
                cursor: "pointer",
                transition: "background-color 0.2s ease",
                flexShrink: 0,
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
              flexShrink: 0,
            }}
          >
            <div className="flex items-center gap-2">
              {/* Prev Page Button */}
              <button
                onClick={() =>
                  setCurrentPageIndex(Math.max(0, currentPageIndex - 1))
                }
                disabled={currentPageIndex === 0}
                className={`p-1 rounded border ${
                  currentPageIndex === 0
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                    : "bg-white hover:bg-gray-50 border-gray-300 cursor-pointer"
                }`}
                aria-label="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="text-sm text-gray-700">
                Page {currentPageIndex + 1} of {pages.length}
              </span>

              {/* Next Page Button */}
              <button
                onClick={() =>
                  setCurrentPageIndex(
                    Math.min(pages.length - 1, currentPageIndex + 1),
                  )
                }
                disabled={currentPageIndex >= pages.length - 1}
                className={`p-1 rounded border ${
                  currentPageIndex >= pages.length - 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                    : "bg-white hover:bg-gray-50 border-gray-300 cursor-pointer"
                }`}
                aria-label="Next Page"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Add Page Button */}
            <button
              onClick={addNewPage}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border bg-white hover:bg-gray-50 border-gray-300 cursor-pointer"
              aria-label="Add New Page"
            >
              <FilePlus size={16} />
              Add Page
            </button>
          </div>

          {/* Layer Container */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "calc(100% - 104px)", // Top toolbar + page nav height
              overflow: "hidden",
              flexGrow: 1,
            }}
            ref={containerRef}
          >
            {/* Text Editor Layer (Bottom) */}
            <div
              className="text-layer"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                zIndex: 1,
                padding: "8px", // Padding inside the text layer
                boxSizing: "border-box",
                overflow: "hidden", // Hide potential quill overflow
              }}
            >
              <ReactQuill
                value={pageContent.content} // Controlled component
                onChange={handleQuillChange}
                modules={quillModules}
                placeholder="Start typing here..."
                theme="snow"
                style={{
                  height: "100%",
                  backgroundColor: "transparent", // Make transparent
                  border: "none", // Remove Quill's border
                  pointerEvents: tool === "select" ? "auto" : "none", // Interact only if select tool active
                }}
                className="[&_.ql-container]:!border-none [&_.ql-editor]:h-full [&_.ql-editor]:p-2" // Tailwind CSS for styling Quill internals if needed
              />
            </div>

            {/* Drawing Canvas Layer (Top) */}
            <Stage
              ref={stageRef}
              width={
                containerRef.current?.clientWidth ||
                width - (sidebarVisible ? 300 : 0)
              } // Dynamic width
              height={containerRef.current?.clientHeight || height - 104} // Dynamic height
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
                zIndex: 10, // Above text layer
                pointerEvents:
                  tool === "brush" || tool === "eraser" ? "auto" : "none",
                cursor:
                  tool === "brush"
                    ? "crosshair"
                    : tool === "eraser"
                      ? "cell"
                      : "default",
              }}
            >
              <Layer>
                {/* Render drawing lines (pageContent.lines is now guaranteed to be an array) */}
                {pageContent.lines.map((line, i) => (
                  <Line
                    key={`${pageContent.id}-line-${i}`} // More specific key
                    points={line.points}
                    stroke={line.color || "#000000"}
                    strokeWidth={line.width || 5}
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
        </div>

        {/* Sidebar */}
        {sidebarVisible && (
          <div
            className="rich-sketchpad-sidebar flex flex-col" // Use flex column
            style={{
              width: "300px",
              height: "100%",
              borderLeft: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
              transition: "width 0.3s ease", // Transition width
              flexShrink: 0, // Prevent shrinking
              overflow: "hidden", // Hide overflow, inner content scrolls
            }}
          >
            {/* Sidebar Header */}
            <div
              className="sidebar-header flex items-center justify-center flex-shrink-0" // Added flex classes
              style={{
                padding: "16px",
                borderBottom: "1px solid #e5e7eb",
                backgroundColor: "#f9fafb",
                height: "56px", // Match top toolbar height
              }}
            >
              <h3 className="m-0 text-base font-semibold">
                {" "}
                {/* Tailwind classes */}
                Freenote Tools
              </h3>
            </div>

            {/* Drawing Tools Content (Scrollable) */}
            <div
              className="flex-grow p-4 flex flex-col gap-6 overflow-y-auto" // Make scrollable
            >
              {/* Tool Selection Section */}
              <div className="tool-section">
                <h4 className="mt-0 mb-3 text-sm font-semibold text-gray-600">
                  {" "}
                  {/* Tailwind */}
                  Tool Selection
                </h4>
                <div className="flex gap-2">
                  {" "}
                  {/* Tailwind */}
                  {/* Brush Button */}
                  <button
                    onClick={() => setTool("brush")}
                    className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-md border cursor-pointer transition-all duration-200 ease-in-out outline-offset-2 ${
                      tool === "brush"
                        ? "border-2 border-blue-500 bg-blue-50"
                        : "border border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                    aria-pressed={tool === "brush"}
                    title="Select Brush Tool"
                  >
                    <Pencil
                      size={20}
                      className={
                        tool === "brush" ? "text-blue-600" : "text-gray-500"
                      }
                    />
                    <span
                      className={`text-sm ${
                        tool === "brush" ? "text-blue-600" : "text-gray-700"
                      }`}
                    >
                      Brush
                    </span>
                  </button>
                  {/* Eraser Button */}
                  <button
                    onClick={() => setTool("eraser")}
                    className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-md border cursor-pointer transition-all duration-200 ease-in-out outline-offset-2 ${
                      tool === "eraser"
                        ? "border-2 border-blue-500 bg-blue-50"
                        : "border border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                    aria-pressed={tool === "eraser"}
                    title="Select Eraser Tool"
                  >
                    <Eraser
                      size={20}
                      className={
                        tool === "eraser" ? "text-blue-600" : "text-gray-500"
                      }
                    />
                    <span
                      className={`text-sm ${
                        tool === "eraser" ? "text-blue-600" : "text-gray-700"
                      }`}
                    >
                      Eraser
                    </span>
                  </button>
                  {/* Text Tool Button */}
                  <button
                    onClick={() => {
                      setTool("select");
                      setTimeout(() => quillRef.current?.focus(), 100); // Focus quill
                    }}
                    className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-md border cursor-pointer transition-all duration-200 ease-in-out outline-offset-2 ${
                      tool === "select"
                        ? "border-2 border-blue-500 bg-blue-50"
                        : "border border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                    aria-pressed={tool === "select"}
                    title="Select Text / Objects"
                  >
                    <Type
                      size={20}
                      className={
                        tool === "select" ? "text-blue-600" : "text-gray-500"
                      }
                    />
                    <span
                      className={`text-sm ${
                        tool === "select" ? "text-blue-600" : "text-gray-700"
                      }`}
                    >
                      Text
                    </span>
                  </button>
                </div>
              </div>

              {/* Color Selection (Only shown for Brush) */}
              {tool === "brush" && (
                <div className="tool-section">
                  <h4 className="mt-0 mb-3 text-sm font-semibold text-gray-600">
                    Color
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {" "}
                    {/* Tailwind */}
                    {colorOptions.map((colorOption) => (
                      <button
                        key={colorOption}
                        onClick={() => setColor(colorOption)}
                        className={`w-9 h-9 rounded-full border cursor-pointer transition-transform duration-100 ease-in-out outline-none focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 ${
                          // Added focus styles
                          color === colorOption
                            ? "border-2 border-black scale-110" // Highlight selected color
                            : "border border-gray-300"
                        }`}
                        style={{ backgroundColor: colorOption }}
                        aria-label={`Select color ${colorOption}`}
                        title={colorOption}
                      />
                    ))}
                    {/* Custom Color Button */}
                    <button
                      onClick={() => {
                        const input = document.getElementById(
                          "color-picker-input",
                        ) as HTMLInputElement;
                        input?.click();
                      }}
                      className="w-9 h-9 rounded-full border border-dashed border-gray-400 flex items-center justify-center cursor-pointer text-gray-500 hover:text-gray-700 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400" // Added hover/focus
                      aria-label="Choose custom color"
                      title="Custom color"
                    >
                      <Palette size={18} />
                      {/* Hidden color input */}
                      <input
                        id="color-picker-input"
                        type="color"
                        value={color} // Controlled input
                        className="invisible w-0 h-0 absolute" // Tailwind for hiding
                        onChange={(e) => setColor(e.target.value)}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Brush Size (Only shown for Brush) */}
              {tool === "brush" && (
                <div className="tool-section">
                  <h4 className="mt-0 mb-3 text-sm font-semibold text-gray-600">
                    Brush Size
                  </h4>
                  <div className="flex items-center gap-3">
                    {" "}
                    {/* Tailwind */}
                    {/* Decrease Button */}
                    <button
                      onClick={() =>
                        setStrokeWidth(Math.max(1, strokeWidth - 1))
                      }
                      className="w-8 h-8 rounded border border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-400" // Added focus/disabled styles
                      disabled={strokeWidth <= 1}
                      aria-label="Decrease brush size"
                    >
                      <Minus size={16} />
                    </button>
                    {/* Slider */}
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={strokeWidth}
                      onChange={(e) =>
                        setStrokeWidth(Number.parseInt(e.target.value))
                      }
                      className="flex-grow cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none accent-blue-500" // Styled slider
                      style={{ accentColor: color }} // Use current color for thumb
                      aria-label="Brush size slider"
                    />
                    {/* Increase Button */}
                    <button
                      onClick={() =>
                        setStrokeWidth(Math.min(20, strokeWidth + 1))
                      }
                      className="w-8 h-8 rounded border border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-400" // Added focus/disabled styles
                      disabled={strokeWidth >= 20}
                      aria-label="Increase brush size"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  {/* Size Label */}
                  <div className="text-center mt-2 text-sm text-gray-600">
                    {strokeWidth}px
                  </div>
                  {/* Preview circle */}
                  <div className="flex justify-center mt-2 h-8 items-center">
                    {" "}
                    {/* Fixed height */}
                    <div
                      style={{
                        width: `${strokeWidth}px`,
                        height: `${strokeWidth}px`,
                        minWidth: "2px", // Ensure visibility for small sizes
                        minHeight: "2px",
                        borderRadius: "50%",
                        backgroundColor: color,
                        transition: "width 0.1s ease, height 0.1s ease",
                      }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              )}

              {/* Pages Section */}
              <div className="tool-section">
                <h4 className="mt-0 mb-3 text-sm font-semibold text-gray-600">
                  Pages
                </h4>
                <div className="flex flex-col gap-2">
                  {" "}
                  {/* Tailwind */}
                  {/* List of pages */}
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                    {" "}
                    {/* Tailwind */}
                    {(pages || []).map((page, index) => (
                      <button
                        key={page.id || index}
                        onClick={() => setCurrentPageIndex(index)}
                        className={`flex items-center w-full px-3 py-2 text-left cursor-pointer ${
                          // Tailwind
                          currentPageIndex === index
                            ? "bg-blue-50"
                            : "bg-transparent hover:bg-gray-50"
                        } ${
                          index < (pages || []).length - 1
                            ? "border-b border-gray-200"
                            : ""
                        }`}
                      >
                        <span
                          className={`text-sm ${
                            // Tailwind
                            currentPageIndex === index
                              ? "font-medium text-blue-600"
                              : "font-normal text-gray-700"
                          }`}
                        >
                          Page {index + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                  {/* Add new page button */}
                  <button
                    onClick={addNewPage}
                    className="flex items-center justify-center gap-2 py-2 bg-gray-100 border border-gray-200 rounded-md cursor-pointer text-sm hover:bg-gray-200" // Tailwind
                  >
                    <FilePlus size={16} />
                    Add New Page
                  </button>
                </div>
              </div>

              {/* Spacer to push action buttons down */}
              <div className="flex-grow"></div>

              {/* Undo Button */}
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="flex items-center justify-center gap-2 px-4 py-2.5 mb-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-md cursor-pointer transition-colors duration-200 ease-in-out hover:bg-blue-100 hover:border-blue-300 font-medium w-full flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-50 disabled:hover:border-blue-200"
                title="Undo last action (Ctrl+Z)"
              >
                <Undo size={16} />
                Undo Last Action
              </button>

              {/* Clear Drawings Button */}
              <button
                onClick={handleClearDrawing}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-md cursor-pointer transition-colors duration-200 ease-in-out hover:bg-red-100 hover:border-red-300 font-medium w-full flex-shrink-0" // Tailwind + flex-shrink-0
              >
                <Trash2 size={16} />
                Clear Current Page Drawings
              </button>
            </div>
          </div>
        )}
      </div>
    );
  },
);

// Helper function for debouncing (consider adding a .flush() method if needed)
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  const debouncedFn = function (
    this: ThisParameterType<T>,
    ...args: Parameters<T>
  ): void {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null; // Clear timeoutId after execution
    }, delay);
  };

  // Add a flush method if needed for imperative saving
  // debouncedFn.flush = () => {
  //   if (timeoutId) {
  //     clearTimeout(timeoutId);
  //     // How to get the last arguments? Might need to store them.
  //     // Or just call the original function with the *current* state.
  //     // fn.apply(this, lastArgs); // Requires storing lastArgs
  //     timeoutId = null;
  //   }
  // };

  return debouncedFn;
}

// Add displayName for better debugging
RichSketchpadImpl.displayName = "RichSketchpadImpl";

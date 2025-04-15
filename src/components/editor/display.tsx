import { Tiptap } from "./notebook";
import { RichSketchpadImpl } from "../custom-free-note/rich-sketchpad";
import {
  useState,
  useLayoutEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Note } from "@/lib/types";
import { RichSketchpadData } from "@/lib/types";
interface NoteDisplayProps {
  note: Note;
  type: "notebook" | "freenote";
}

export const NoteDisplay = forwardRef<any, NoteDisplayProps>(
  ({ note, type }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const notebookRef = useRef<any>(null);
    const freenoteRef = useRef<any>(null);

    console.log(note);

    // Example initial data and change handler (replace with your actual logic)
    const [sketchData, setSketchData] = useState<RichSketchpadData | undefined>(
      undefined,
    );

    useLayoutEffect(() => {
      const measureContainer = () => {
        if (containerRef.current) {
          setDimensions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          });
        }
      };

      // Initial measurement
      measureContainer();

      // Use ResizeObserver to handle dynamic size changes
      const resizeObserver = new ResizeObserver(measureContainer);
      let currentRef = containerRef.current; // Capture ref value

      if (currentRef) {
        resizeObserver.observe(currentRef);
      }

      // Cleanup function
      return () => {
        if (currentRef) {
          resizeObserver.unobserve(currentRef);
        }
        resizeObserver.disconnect();
      };
    }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount
    const updateNote = (id: string, updates: Partial<Note>) => {
      const updatedNote: Note = {
        ...note,
        ...updates,
        metadata: {
          ...note.metadata,
          last_accessed: new Date().toISOString(),
        },
      };
      // Perform the update operation here
      // For example, you can use an API call to update the note in the database
      // Example: await updateNoteInDatabase(updatedNote);
    };

    useImperativeHandle(ref, () => ({
      notebookRef,
      getHTML: () => {
        console.log(type);
        // Ensure it's the notebook type and the ref is populated
        if (type == "notebook" && notebookRef.current) {
          // Call the getContent method exposed by Tiptap's useImperativeHandle
          console.log(notebookRef.current.getContent());
          return notebookRef.current.getContent();
        }
        if (type == "freenote" && freenoteRef.current) {
          console.log(freenoteRef.current.getContent());
          return freenoteRef.current.getContent();
        }
        // Handle cases where it's not a notebook or not ready
        else {
          console.warn(
            "getHTML called, but editor is not a notebook or not ready.",
          );
        }
        return undefined; // Or return null, empty string, or throw an error
      },
    }));

    if (type === "notebook") {
      return (
        <div ref={containerRef} className="w-full h-full overflow-hidden">
          {" "}
          {/* Changed overflow-auto to hidden on parent */}
          {/* Render the sketchpad only when we have valid dimensions */}
          {dimensions.width > 0 && dimensions.height > 0 ? (
            <Tiptap note={note} updateNote={updateNote} ref={notebookRef} />
          ) : (
            // Optional: Show a loading state or placeholder
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              Loading Sketchpad...
            </div>
          )}
        </div>
      );
    } else if (type === "freenote") {
      return (
        <div ref={containerRef} className="w-full h-full overflow-hidden">
          {" "}
          {/* Changed overflow-auto to hidden on parent */}
          {/* Render the sketchpad only when we have valid dimensions */}
          <RichSketchpadImpl
            width={dimensions.width}
            height={dimensions.height}
            note={note} // Pass initial data if needed
            updateNote={updateNote}
            ref={freenoteRef}
          />
        </div>
      );
    }
  },
);

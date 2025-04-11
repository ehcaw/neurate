import { Node, NodeViewProps, RawCommands } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ComponentType } from "react";

function decodeHTMLEntities(text: string) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

export default function NodeWrapper({
  component,
  name,
  group,
  props,
}: {
  component: ComponentType<NodeViewProps>;
  name: string;
  group: string;
  props: any;
}) {
  return Node.create({
    name: name, // A unique identifier
    group: group, // Typically 'block' or 'inline'

    // Define attributes to store data
    addAttributes() {
      return {
        width: {
          default: 1000,
        },
        height: {
          default: 700,
        },
        lines: {
          default: [],
          parseHTML: (element) => {
            const linesAttr = element.getAttribute("lines") || "[]";
            try {
              const decodedLines = decodeHTMLEntities(linesAttr);
              return JSON.parse(decodedLines);
            } catch (error) {
              console.error(`Error parsing lines attribute: ${error}`);
              return [];
            }
          },
          renderHTML: (attributes) => {
            return {
              lines: JSON.stringify(attributes.lines),
            };
          },
        },
      };
    },

    // Configure HTML parsing
    parseHTML() {
      return [{ tag: "sketchpad" }];
    },

    // Configure HTML rendering
    renderHTML({ HTMLAttributes }) {
      return ["sketchpad", HTMLAttributes];
    },

    // Add the React component as a node view
    addNodeView() {
      return ReactNodeViewRenderer(component);
    },

    addCommands() {
      return {
        // This syntax aligns with Tiptap's expected command structure
        insertCustomNode:
          (attributes = {}) =>
          ({ commands }: { commands: RawCommands }) =>
            commands.insertContent({
              type: this.name,
              attrs: attributes,
            }),
      } as Partial<RawCommands>;
    },
    toJSON() {
      return {
        type: this.name,
        attrs: this.attrs,
      };
    },
  });
}

import { Node, NodeViewProps, RawCommands } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ComponentType } from "react";

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
    addStorage() {
      return {
        toJSON(node) {
          return {
            type: name,
            attrs: {
              width: node.attrs.width,
              height: node.attrs.height,
              someData: node.attrs.someData,
            },
          };
        },
        fromJSON(json, schema) {
          return schema.nodes[name].create(json.attrs);
        },
      };
    },
  });
}

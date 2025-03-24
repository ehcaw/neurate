import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";
import { ReactRenderer } from "@tiptap/react";
import { Editor } from "@tiptap/react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  Text as TextIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Code,
  ImageIcon,
  Sparkles,
  Pencil,
} from "lucide-react";

// Command menu component
const CommandList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex(
          (selectedIndex + props.items.length - 1) % props.items.length,
        );
        return true;
      }

      if (event.key === "ArrowDown") {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }

      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }

      return false;
    },
  }));

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  return (
    <div className="slash-commands bg-popover border rounded-md shadow-lg overflow-hidden p-1 w-64 text-popover-foreground">
      {props.items.length ? (
        props.items.map((item: any, index: number) => (
          <button
            key={index}
            className={`
              flex items-center gap-2 w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground
              ${index === selectedIndex ? "bg-accent text-accent-foreground" : ""}
            `}
            onClick={() => selectItem(index)}
          >
            <div className="w-5 h-5 flex items-center justify-center text-primary">
              {item.icon}
            </div>
            <div>
              <div className="font-medium">{item.title}</div>
              {item.description && (
                <div className="text-xs text-muted-foreground">
                  {item.description}
                </div>
              )}
            </div>
          </button>
        ))
      ) : (
        <div className="px-2 py-1 text-sm text-muted-foreground">
          No results
        </div>
      )}
    </div>
  );
});

CommandList.displayName = "CommandList";

const SlashCommands = Extension.create({
  name: "slashCommands",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: any;
          props: any;
        }) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          const items = [
            {
              title: "Text",
              description: "Just start writing with plain text",
              icon: <TextIcon className="h-4 w-4" />,
              command: ({ editor, range }: { editor: any; range: any }) => {
                editor.chain().focus().deleteRange(range).run();
              },
            },
            {
              title: "Heading 1",
              description: "Large section heading",
              icon: <Heading1 className="h-4 w-4" />,
              command: ({ editor, range }: { editor: any; range: any }) => {
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .setNode("heading", { level: 1 })
                  .run();
              },
            },
            {
              title: "Heading 2",
              description: "Medium section heading",
              icon: <Heading2 className="h-4 w-4" />,
              command: ({ editor, range }: { editor: any; range: any }) => {
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .setNode("heading", { level: 2 })
                  .run();
              },
            },
            {
              title: "Bullet List",
              description: "Create a simple bullet list",
              icon: <List className="h-4 w-4" />,
              command: ({ editor, range }: { editor: any; range: any }) => {
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .toggleBulletList()
                  .run();
              },
            },
            {
              title: "Numbered List",
              description: "Create a numbered list",
              icon: <ListOrdered className="h-4 w-4" />,
              command: ({ editor, range }: { editor: any; range: any }) => {
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .toggleOrderedList()
                  .run();
              },
            },
            {
              title: "Code Block",
              description: "Add a code block",
              icon: <Code className="h-4 w-4" />,
              command: ({ editor, range }: { editor: any; range: any }) => {
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .toggleCodeBlock()
                  .run();
              },
            },
            {
              title: "Image",
              description: "Upload an image",
              icon: <ImageIcon className="h-4 w-4" />,
              command: ({ editor, range }: { editor: any; range: any }) => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";

                input.onchange = async (event) => {
                  const file = (event.target as HTMLInputElement).files?.[0];
                  if (!file) return;

                  // Replace with your actual upload logic
                  const url = URL.createObjectURL(file);

                  editor
                    .chain()
                    .focus()
                    .deleteRange(range)
                    .setImage({ src: url, alt: file.name })
                    .run();
                };

                input.click();
              },
            },
            {
              title: "AI Assist",
              description: "Generate content with AI",
              icon: <Sparkles className="h-4 w-4" />,
              command: ({ editor, range }: { editor: any; range: any }) => {
                // Replace with your actual AI generation logic
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .insertContent("AI generated text would go here")
                  .run();
              },
            },
            {
              title: "Sketchpad",
              description: "Draw on the page",
              icon: <Pencil className="h-4 w-4" />,
              command: ({ editor, range }: { editor: any; range: any }) => {
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .insertContent({
                    type: "sketchpad",
                    attrs: {
                      width: 1000,
                      height: 700,
                    },
                  })
                  .run();
              },
            },
          ];

          if (!query) return items;

          return items.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase()),
          );
        },
        render: () => {
          let component: any;
          let popup: any;

          return {
            onStart: (props) => {
              component = new ReactRenderer(CommandList, {
                props,
                editor: props.editor,
              });

              // Create the tippy instance
              const getReferenceClientRect = () => {
                const rect = props.clientRect?.();
                // Ensure we never return null to satisfy tippy's type requirements
                return (
                  rect || {
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    width: 0,
                    height: 0,
                  }
                );
              };

              const tippyInstance = tippy("body", {
                getReferenceClientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              });

              // Store the instance properly
              popup = tippyInstance[0];
            },

            onUpdate(props) {
              component.updateProps(props);

              if (popup) {
                popup.setProps({
                  getReferenceClientRect: props.clientRect,
                });
              }
            },

            onKeyDown(props) {
              if (props.event.key === "Escape") {
                if (popup) {
                  popup.hide();
                }
                return true;
              }

              return component.ref?.onKeyDown(props);
            },

            onExit() {
              if (popup) {
                popup.destroy();
              }

              if (component) {
                component.destroy();
              }
            },
          };
        },
      }),
    ];
  },
});

export default SlashCommands;

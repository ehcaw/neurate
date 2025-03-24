"use client";

import { type ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SidebarSectionProps {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
}

export function SidebarSection({
  title,
  children,
  icon,
  defaultOpen = false,
}: SidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-2">
      <CollapsibleTrigger className="flex w-full items-center justify-between p-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 rounded-md">
        <div className="flex items-center gap-1">
          {icon}
          <span>{title}</span>
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            isOpen ? "transform rotate-0" : "transform rotate-[-90deg]",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 space-y-1">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

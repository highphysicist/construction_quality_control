import { type ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "@/components/ui/pop-over";

const NotImplemented: React.FC<{ children: ReactNode; feature?: string }> = ({
  children,
  feature,
}) => {
  return (
    <Popover>
      <PopoverTrigger
        asChild
        className=" hover:cursor-not-allowed"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent className="z-50" side="left" align="end" sideOffset={5}>
          <div className="rounded-md border-2 bg-white px-6 py-4">
            <h1 className="text-sm font-semibold">Not implemented</h1>
            <p className="max-w-32 flex text-xs text-gray-500">
              {feature
                ? `This feature is intentionally omitted in the current demo build: ${feature}.`
                : "This feature is intentionally omitted in the current demo build."}
            </p>
          </div>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};

export { NotImplemented };

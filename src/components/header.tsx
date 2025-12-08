import { getCurrentWindow } from "@tauri-apps/api/window";
import { platform } from "@tauri-apps/plugin-os";
import { PlusIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { Tab } from "@/components/app";
import { cn } from "@/utils";

export function Header({
  tabs,
  activeTabId,
  setActiveTabId,
  createTab,
  closeTab,
}: {
  tabs: Tab[];
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  createTab: () => void;
  closeTab: (id: string) => void;
}) {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    let unlisten: () => void;

    const initResize = async () => {
      unlisten = await getCurrentWindow().onResized(async () => {
        setIsFullscreen(await getCurrentWindow().isFullscreen());
      });
    };

    initResize();

    return () => {
      unlisten?.();
    };
  }, []);

  return (
    <header
      data-tauri-drag-region
      className={cn("flex h-7 select-none overflow-x-scroll border-white/10 border-b bg-black/40", {
        "pl-17": !isFullscreen && platform() === "macos",
        "pr-17": !isFullscreen && platform() === "windows",
      })}
    >
      {tabs.map((tab) => (
        // biome-ignore lint/a11y/noStaticElementInteractions: tab is clickable
        <div
          data-tauri-drag-region
          key={tab.id}
          onClick={() => setActiveTabId(tab.id)}
          className={cn(
            "group flex cursor-pointer items-center justify-center border-white/5 border-r px-4 text-xs",
            tab.id === activeTabId
              ? "bg-white/10 font-medium text-white"
              : "text-white/50 hover:bg-white/5",
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setActiveTabId(tab.id);
            }
          }}
        >
          <span data-tauri-drag-region className="max-w-40 truncate">
            {tab.title}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
            className="ml-2 cursor-pointer opacity-0 transition-all hover:opacity-100 group-hover:opacity-100"
          >
            <XIcon className="size-3" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={createTab}
        className="flex w-9 cursor-pointer items-center justify-center text-white/50 transition-all hover:text-white"
      >
        <PlusIcon className="size-3" />
      </button>
    </header>
  );
}

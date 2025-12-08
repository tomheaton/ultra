import { useCallback, useEffect, useState } from "react";
import { Terminal } from "@/components/terminal";
import { cn } from "@/utils";

type Tab = {
  id: string;
  title: string;
};

export function App() {
  const [tabs, setTabs] = useState<Tab[]>([{ id: "init", title: "Terminal" }]);
  const [activeTabId, setActiveTabId] = useState<string>("init");

  const createTab = useCallback(() => {
    const id = Math.random().toString(36).substring(2, 9);
    setTabs((prev) => [...prev, { id, title: "Shell" }]);
    setActiveTabId(id);
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const newTabs = prev.filter((t) => t.id !== id);
        // If we closed the active tab, switch to the last one
        if (id === activeTabId && newTabs.length > 0) {
          setActiveTabId(newTabs[newTabs.length - 1].id);
        }
        return newTabs;
      });
    },
    [activeTabId],
  );

  const updateTitle = useCallback((id: string, title: string) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "t":
          e.preventDefault();
          createTab();
          break;
        case "w":
          e.preventDefault();
          closeTab(activeTabId);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeTabId, closeTab, createTab]);

  if (tabs.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center text-white">
        No Open Tabs{" "}
        <button type="button" onClick={createTab} className="ml-4 underline">
          Open One
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#000000CC] text-white">
      {tabs.length > 1 && (
        <header className="flex h-9 w-full select-none border-white/10 border-b bg-black/40">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={cn(
                "group flex min-w-[150px] cursor-pointer items-center justify-center border-white/5 border-r px-4 text-xs",
                tab.id === activeTabId
                  ? "bg-white/10 font-medium text-white"
                  : "text-white/50 hover:bg-white/5",
              )}
            >
              <span className="max-w-[100px] truncate">{tab.title}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="ml-2 opacity-0 hover:opacity-100 group-hover:opacity-100"
              >
                x
              </button>
            </button>
          ))}

          <button
            type="button"
            onClick={createTab}
            className="flex w-9 cursor-pointer items-center justify-center text-white/50 hover:text-white"
          >
            +
          </button>
        </header>
      )}

      {/* Terminal Container */}
      <main className="relative flex-1">
        {tabs.map((tab) => (
          /* We map ALL tabs but hide inactive ones to preserve state/process */
          <div
            key={tab.id}
            className={cn("absolute inset-0", tab.id === activeTabId ? "z-10 block" : "z-0 hidden")}
          >
            <Terminal
              id={tab.id}
              isActive={tab.id === activeTabId}
              onTitleChange={updateTitle}
              onExit={closeTab}
            />
          </div>
        ))}
      </main>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/header";
import { StatusBar } from "@/components/status-bar";
import { Terminal } from "@/components/terminal";
import { MAX_TABS } from "@/constants/settings";
import { cn } from "@/utils";

export type Tab = {
  id: string;
  title: string;
};

export function App() {
  const [tabs, setTabs] = useState<Tab[]>([{ id: "init", title: "Terminal" }]);
  const [activeTabId, setActiveTabId] = useState<string>("init");

  const createTab = useCallback(() => {
    if (tabs.length >= MAX_TABS) {
      console.warn(`Maximum of ${MAX_TABS} tabs reached`);
      return;
    }

    const id = Math.random().toString(36).substring(2, 9);
    setTabs((prev) => [...prev, { id, title: "Shell" }]);
    setActiveTabId(id);
  }, [tabs.length]);

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
      <Header
        tabs={tabs}
        activeTabId={activeTabId}
        setActiveTabId={setActiveTabId}
        createTab={createTab}
        closeTab={closeTab}
      />

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

      <StatusBar />
    </div>
  );
}

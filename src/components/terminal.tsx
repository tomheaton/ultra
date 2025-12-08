import "@xterm/xterm/css/xterm.css";

import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { platform } from "@tauri-apps/plugin-os";
import { FitAddon } from "@xterm/addon-fit";
import { LigaturesAddon } from "@xterm/addon-ligatures";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal as XtermTerminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";
import { SCROLLBACK } from "@/constants/settings";
import { THEME } from "@/constants/theme";
import { cn } from "@/utils";

export function Terminal({
  id,
  isActive,
  onTitleChange,
  // onExit,
}: {
  id: string;
  isActive: boolean;
  onTitleChange: (id: string, title: string) => void;
  onExit: (id: string) => void;
}) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const pidRef = useRef<number | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) {
      console.error("Terminal ref is null");
      return;
    }

    const term = new XtermTerminal({
      cursorBlink: true,
      fontFamily:
        '"Jetbrains Mono", "Menlo", "DejaVu Sans Mono", "Consolas", "Lucida Console", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      letterSpacing: 0,
      theme: THEME,
      allowTransparency: true,
      macOptionIsMeta: true,
      scrollback: SCROLLBACK,
      allowProposedApi: true, // For ligatures
    });

    const fitAddon = new FitAddon();
    const webglAddon = new WebglAddon();
    const webLinksAddon = new WebLinksAddon();
    const ligaturesAddon = new LigaturesAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(terminalRef.current);

    // Some plugins need to be loaded after opening the terminal

    try {
      term.loadAddon(ligaturesAddon);
    } catch (e) {
      console.warn("Ligatures addon failed to load", e);
    }

    try {
      webglAddon.onContextLoss(() => {
        webglAddon.dispose();
      });
      term.loadAddon(webglAddon);
    } catch (e) {
      console.warn("WebGL addon failed to load, falling back to canvas", e);
    }

    fitAddon.fit();
    term.focus();
    fitAddonRef.current = fitAddon;

    let unlisten: () => void;

    const initShell = async () => {
      try {
        const pid = await invoke<number>("open_shell", {
          shell: platform() === "windows" ? "powershell.exe" : "zsh",
          cols: term.cols,
          rows: term.rows,
        });

        pidRef.current = pid;

        unlisten = await getCurrentWindow().listen<string>(`shell-output-${pid}`, (event) => {
          term.write(event.payload);
        });

        term.onTitleChange(async (title) => {
          console.log("Title changed:", title);
          onTitleChange(id, title);
          await getCurrentWindow().setTitle(title);
        });
      } catch (err) {
        term.write(`\r\n\x1b[31mError launching shell: ${err}\x1b[0m\r\n`);
      }
    };

    initShell();

    const onDataDisposable = term.onData((data) => {
      if (pidRef.current !== null) {
        invoke("write_to_shell", {
          pid: pidRef.current,
          text: data,
        }).catch(console.error);
      }
    });

    const onResizeDisposable = term.onResize((size) => {
      if (pidRef.current !== null) {
        invoke("resize_shell", {
          pid: pidRef.current,
          cols: size.cols,
          rows: size.rows,
        }).catch(console.error);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        fitAddon.fit();
      });
    });

    resizeObserver.observe(terminalRef.current);

    window.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "t") {
        e.preventDefault();
        console.log("New tab shortcut pressed");
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "w") {
        e.preventDefault();
        console.log("Close tab shortcut pressed");
      }
    });

    return () => {
      resizeObserver.disconnect();

      unlisten?.();

      onDataDisposable.dispose();
      onResizeDisposable.dispose();

      // This automatically disposes addons
      term.dispose();

      if (pidRef.current) {
        invoke("close_shell", { pid: pidRef.current }).catch(console.error);
      }
    };
  }, [id, onTitleChange]);

  return (
    <div
      ref={terminalRef}
      className={cn("h-full w-full overflow-hidden p-2", isActive ? "block" : "hidden")}
    />
  );
}

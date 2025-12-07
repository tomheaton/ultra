import "@xterm/xterm/css/xterm.css";

import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { platform } from "@tauri-apps/plugin-os";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal as XtermTerminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";

export function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const pidRef = useRef<number | null>(null);

  useEffect(() => {
    if (!terminalRef.current) {
      return;
    }

    const term = new XtermTerminal({
      cursorBlink: true,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();
    term.focus();

    const shell = platform() === "windows" ? "powershell.exe" : "bash";

    let unlisten: () => void;

    const initShell = async () => {
      try {
        const pid = await invoke<number>("open_shell", {
          shell,
          cols: term.cols,
          rows: term.rows,
        });

        console.log("Spawned shell with PID:", pid);
        pidRef.current = pid;

        unlisten = await getCurrentWindow().listen<string>(`shell-output-${pid}`, (event) => {
          term.write(event.payload);
        });
      } catch (err) {
        console.error("Failed to spawn shell", err);
        term.write(`\r\nError launching shell: ${err}\r\n`);
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
      fitAddon.fit();
    });

    const handleWindowResize = () => fitAddon.fit();
    window.addEventListener("resize", handleWindowResize);

    return () => {
      console.log("Terminal unmounted");

      window.removeEventListener("resize", handleWindowResize);

      unlisten?.();

      onDataDisposable.dispose();
      onResizeDisposable.dispose();

      term.dispose();

      if (pidRef.current) {
        invoke("close_shell", { pid: pidRef.current });
      }
    };
  }, []);

  return <div ref={terminalRef} className="size-full overflow-hidden" />;
}

import "@xterm/xterm/css/xterm.css";

import { Command } from "@tauri-apps/plugin-shell";
import { Terminal as XtermTerminal } from "@xterm/xterm";
import { useCallback, useEffect, useRef } from "react";

export function Terminal() {
  const textRef = useRef<string>("");
  const terminalRef = useRef<HTMLDivElement>(null);

  const executeCommand = useCallback(async (cmd: string, terminal: XtermTerminal) => {
    console.log("executeCommand");

    const command = Command.create(cmd.split(" ")[0], cmd.split(" ").slice(1));
    command.on("close", (data) => {
      terminal.write(`command finished with code ${data.code} and signal ${data.signal}\r\n`);
      console.log(`command finished with code ${data.code} and signal ${data.signal}`);
    });
    command.on("error", (error) => {
      terminal.write(`command error: "${error}"\r\n`);
      console.error(`command error: "${error}"`);
    });
    command.stdout.on("data", (line) => {
      terminal.write(`${line}\r\n`);
      console.log(`command stdout: "${line}"`);
    });
    command.stderr.on("data", (line) => {
      terminal.write(`command stderr: "${line}"\r\n`);
      console.log(`command stderr: "${line}"`);
    });

    const child = await command.spawn();
    console.log("pid:", child.pid);
  }, []);

  useEffect(() => {
    if (!terminalRef.current) {
      console.error("Terminal ref not set");
      return;
    }

    const term = new XtermTerminal();

    term.open(terminalRef.current);

    term.focus();

    term.onKey(async (e) => {
      console.log("event:", e);
      console.log("text:", textRef.current);

      if (e.domEvent.key === "Enter") {
        console.log("enter");
        await executeCommand(textRef.current, term);
        textRef.current = "";
        term.write("\r\n");
      } else if (e.domEvent.key === "Escape") {
        console.log("escape");
        term.write("\x1b");
      } else if (e.domEvent.key === "Backspace") {
        console.log("backspace");
        if (textRef.current.length === 0) {
          return;
        }
        term.write("\b \b");
        textRef.current = textRef.current.slice(0, -1);
      } else if (e.domEvent.key === "Tab") {
        term.write("\t");
        // TODO: get tab size
        textRef.current += "\t";
      } else {
        console.log(e.domEvent.key);
        textRef.current = textRef.current.concat(e.key);
        term.write(e.key);
      }
    });

    return () => {
      term.dispose();
    };
  }, [executeCommand]);

  return <div ref={terminalRef} />;
}

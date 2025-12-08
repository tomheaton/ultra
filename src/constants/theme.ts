import type { ITheme } from "@xterm/xterm";

export const THEME: ITheme = {
  foreground: "#fff",
  background: "rgba(0, 0, 0, 0)",
  cursor: "rgba(248,28,229,0.8)",
  selectionBackground: "rgba(248,28,229,0.3)",
  black: "#000000",
  red: "#C51E14",
  green: "#1DC121",
  yellow: "#C7C329",
  blue: "#0A2FC4",
  magenta: "#C839C5",
  cyan: "#20C5C6",
  white: "#C7C7C7",
  brightBlack: "#686868",
  brightRed: "#FD6F6B",
  brightGreen: "#67F86F",
  brightYellow: "#FFFA72",
  brightBlue: "#6A76FB",
  brightMagenta: "#FD7CFC",
  brightCyan: "#68FDFE",
  brightWhite: "#FFFFFF",
} as const;

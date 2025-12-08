import { useState } from "react";
import { cn } from "@/utils";

const STATUS_COLORS = {
  good: "bg-green-500",
  warning: "bg-yellow-500",
  error: "bg-red-500",
} as const;
type StatusType = keyof typeof STATUS_COLORS;

export function StatusBar() {
  const [statusType] = useState<StatusType>("good");
  const [status] = useState<string>("All systems operational");
  const [line] = useState<number>(1);
  const [column] = useState<number>(1);

  return (
    <div className="flex h-6 w-full items-center border-white/10 border-t bg-black/40 px-2 text-xs">
      <div className="flex items-center gap-2">
        <span className={cn("inline-block size-2 rounded-full", STATUS_COLORS[statusType])} />
        <span>{status}</span>
      </div>
      <div className="flex-1" />
      <span>
        Ln {line}, Col {column}
      </span>
    </div>
  );
}

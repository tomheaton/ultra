import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

export function useIsFullscreen() {
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

  return isFullscreen;
}

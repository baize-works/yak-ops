import {useEffect, useRef, useState} from "react";

export function useResizablePanel(initialWidth = 380) {
  const [rightWidth, setRightWidth] = useState(initialWidth);
  const draggingRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!draggingRef.current) return;

      const viewportWidth = window.innerWidth;
      const nextWidth = viewportWidth - event.clientX - 18;
      const clampedWidth = Math.max(320, Math.min(520, nextWidth));
      setRightWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleResizeStart = () => {
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return {
    rightWidth,
    handleResizeStart,
  };
}

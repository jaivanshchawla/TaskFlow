"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface UseVirtualScrollOptions {
  itemCount: number;
  itemHeight: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  overscan?: number;
}

interface UseVirtualScrollReturn {
  virtualItems: { index: number; offsetTop: number }[];
  totalHeight: number;
  scrollToIndex: (index: number) => void;
}

export function useVirtualScroll({
  itemCount,
  itemHeight,
  containerRef,
  overscan = 10,
}: UseVirtualScrollOptions): UseVirtualScrollReturn {
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [containerRef]);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = containerRef.current
    ? Math.ceil(containerRef.current.clientHeight / itemHeight)
    : 10;
  const endIndex = Math.min(itemCount, startIndex + visibleCount + 2 * overscan);

  const virtualItems = Array.from({ length: endIndex - startIndex }, (_, i) => {
    const index = startIndex + i;
    return { index, offsetTop: index * itemHeight };
  });

  const totalHeight = itemCount * itemHeight;

  const scrollToIndex = useCallback(
    (index: number) => {
      const container = containerRef.current;
      if (!container) return;
      container.scrollTo({ top: index * itemHeight, behavior: "smooth" });
    },
    [containerRef, itemHeight]
  );

  return { virtualItems, totalHeight, scrollToIndex };
}

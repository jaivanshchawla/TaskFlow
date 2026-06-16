"use client";
import { useRef } from "react";
import { useVirtualScroll } from "@/hooks/useVirtualScroll";

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  className,
  overscan = 10,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { virtualItems, totalHeight } = useVirtualScroll({
    itemCount: items.length,
    itemHeight,
    containerRef,
    overscan,
  });

  if (items.length <= 50) {
    return (
      <div className={className}>
        {items.map((item, index) => (
          <div key={index}>{renderItem(item, index)}</div>
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`overflow-y-auto ${className ?? ""}`} style={{ contain: "strict" }}>
      <div style={{ height: totalHeight, position: "relative" }}>
        {virtualItems.map(({ index, offsetTop }) => (
          <div
            key={index}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${offsetTop}px)`,
            }}
          >
            {items[index] != null && renderItem(items[index], index)}
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useRef, useState } from "react";

type DragState = {
  key: string;
  pointerId: number;
  pointerOffsetX: number;
  pointerOffsetY: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Generic pointer-based drag-to-reorder for a grid/list. Works
 * identically for mouse, touch, and stylus via the Pointer Events API
 * — no separate mobile code path needed.
 *
 * Usage pattern:
 *   - Attach `registerItemRef(key, el)` as a ref callback on each item.
 *   - Attach `handlePointerDown(e, key)` on that item's drag handle.
 *   - Attach `handlePointerMove` / `handlePointerUp` on the SAME handle
 *     — pointer capture routes move/up events there even once the
 *     finger/cursor leaves the handle's bounds.
 *   - Render a floating ghost using `dragState` while it's non-null.
 */
export function useDragReorder<T>(
  items: T[],
  getKey: (item: T) => string,
  onReorder: (fromIndex: number, toIndex: number) => void
) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  const registerItemRef = useCallback((key: string, el: HTMLElement | null) => {
    if (el) {
      itemRefs.current.set(key, el);
    } else {
      itemRefs.current.delete(key);
    }
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>, key: string) => {
      e.preventDefault();

      const itemEl = itemRefs.current.get(key);
      if (!itemEl) return;

      const rect = itemEl.getBoundingClientRect();
      e.currentTarget.setPointerCapture(e.pointerId);

      setDragState({
        key,
        pointerId: e.pointerId,
        pointerOffsetX: e.clientX - rect.left,
        pointerOffsetY: e.clientY - rect.top,
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
      });
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      setDragState((prev) => {
        if (!prev || prev.pointerId !== e.pointerId) return prev;
        return { ...prev, x: e.clientX, y: e.clientY };
      });

      if (!dragState || dragState.pointerId !== e.pointerId) return;

      // Hit-test whatever is under the pointer right now to find the
      // item currently being hovered over, and swap live.
      const elUnderPointer = document.elementFromPoint(e.clientX, e.clientY);
      const overEl = elUnderPointer?.closest<HTMLElement>("[data-drag-key]");
      const overKey = overEl?.dataset.dragKey;

      if (overKey && overKey !== dragState.key) {
        const fromIndex = items.findIndex((item) => getKey(item) === dragState.key);
        const toIndex = items.findIndex((item) => getKey(item) === overKey);

        if (fromIndex !== -1 && toIndex !== -1) {
          onReorder(fromIndex, toIndex);
        }
      }
    },
    [dragState, items, getKey, onReorder]
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!dragState || dragState.pointerId !== e.pointerId) return;
      setDragState(null);
    },
    [dragState]
  );

  return {
    dragState,
    registerItemRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp: endDrag,
    handlePointerCancel: endDrag,
  };
}
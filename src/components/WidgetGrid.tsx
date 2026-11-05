import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getPrefs,
  savePrefs,
  type WidgetLayoutItem,
  type WidgetType,
} from '@/lib/prefs';

interface WidgetGridProps {
  cols: number;
  rowHeight: number; // px (approximate, will use CSS grid auto)
  gap: number; // px
  widgets: WidgetLayoutItem[];
  onWidgetsChange: (widgets: WidgetLayoutItem[]) => void;
  isEditMode: boolean;
  renderWidget: (w: WidgetLayoutItem) => React.ReactNode;
  className?: string;
}

/**
 * 4-column widget grid with drag-and-drop + collision detection + snap-to-grid.
 * MVP implementation: supports drag to move, find nearest empty cell on collision.
 */
export default function WidgetGrid({
  cols,
  rowHeight,
  gap,
  widgets,
  onWidgetsChange,
  isEditMode,
  renderWidget,
  className,
}: WidgetGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [previewCell, setPreviewCell] = useState<{ col: number; row: number } | null>(null);
  const dragStartInfo = useRef<{
    id: string;
    startX: number;
    startY: number;
    origCol: number;
    origRow: number;
  } | null>(null);

  const cellSize = useMemo(() => {
    // Will be calculated from grid actual width
    return { width: 0, height: rowHeight };
  }, [rowHeight]);

  const getCellFromPoint = useCallback(
    (clientX: number, clientY: number): { col: number; row: number } | null => {
      const grid = gridRef.current;
      if (!grid) return null;
      const rect = grid.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const cellW = (rect.width - gap * (cols - 1)) / cols;
      const cellH = rowHeight;
      const col = Math.floor((x + gap / 2) / (cellW + gap));
      const row = Math.floor((y + gap / 2) / (cellH + gap));
      if (col < 0 || col >= cols || row < 0) return null;
      return { col, row };
    },
    [cols, rowHeight, gap]
  );

  const findNearestEmptySpot = useCallback(
    (
      startCol: number,
      startRow: number,
      colSpan: number,
      rowSpan: number,
      excludeId: string
    ): { col: number; row: number } | null => {
      // BFS-like: search cells in expanding rings from start
      const visited = new Set<string>();
      const queue: Array<{ col: number; row: number; dist: number }> = [
        { col: startCol, row: startRow, dist: 0 },
      ];

      const occupied = (c: number, r: number): boolean => {
        for (const w of widgets) {
          if (w.id === excludeId) continue;
          if (
            c < w.col + w.colSpan &&
            c + colSpan > w.col &&
            r < w.row + w.rowSpan &&
            r + rowSpan > w.row
          ) {
            return true;
          }
        }
        return false;
      };

      let best: { col: number; row: number; dist: number } | null = null;

      while (queue.length > 0 && queue.length < 200) {
        const cur = queue.shift()!;
        const key = `${cur.col},${cur.row}`;
        if (visited.has(key)) continue;
        visited.add(key);

        if (cur.col < 0 || cur.col + colSpan > cols || cur.row < 0) {
          // continue to neighbors but don't consider this cell
        } else if (!occupied(cur.col, cur.row)) {
          if (!best || cur.dist < best.dist) {
            best = { col: cur.col, row: cur.row, dist: cur.dist };
            // If we found a spot at distance 0 or 1, that's great
            if (cur.dist <= 1) break;
          }
        }

        // Add neighbors
        queue.push({ col: cur.col + 1, row: cur.row, dist: cur.dist + 1 });
        queue.push({ col: cur.col - 1, row: cur.row, dist: cur.dist + 1 });
        queue.push({ col: cur.col, row: cur.row + 1, dist: cur.dist + 1 });
        queue.push({ col: cur.col, row: cur.row - 1, dist: cur.dist + 1 });
      }

      return best ? { col: best.col, row: best.row } : null;
    },
    [widgets, cols]
  );

  const handleDragStart = useCallback(
    (e: React.PointerEvent, widget: WidgetLayoutItem) => {
      if (!isEditMode) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setDraggingId(widget.id);
      dragStartInfo.current = {
        id: widget.id,
        startX: e.clientX,
        startY: e.clientY,
        origCol: widget.col,
        origRow: widget.row,
      };
      setDragPos({ x: e.clientX, y: e.clientY });
    },
    [isEditMode]
  );

  const handleDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingId) return;
      setDragPos({ x: e.clientX, y: e.clientY });

      const widget = widgets.find((w) => w.id === draggingId);
      if (!widget) return;

      const cell = getCellFromPoint(e.clientX, e.clientY);
      if (cell) {
        // Find nearest valid spot (including the cell itself if empty)
        const spot = findNearestEmptySpot(cell.col, cell.row, widget.colSpan, widget.rowSpan, widget.id);
        setPreviewCell(spot);
      } else {
        setPreviewCell(null);
      }
    },
    [draggingId, widgets, getCellFromPoint, findNearestEmptySpot]
  );

  const handleDragEnd = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingId) return;
      const widget = widgets.find((w) => w.id === draggingId);
      if (widget && previewCell) {
        const newWidgets = widgets.map((w) =>
          w.id === draggingId ? { ...w, col: previewCell.col, row: previewCell.row } : w
        );
        onWidgetsChange(newWidgets);
      }
      setDraggingId(null);
      setDragPos(null);
      setPreviewCell(null);
      dragStartInfo.current = null;
    },
    [draggingId, widgets, previewCell, onWidgetsChange]
  );

  const gridStyle = useMemo<React.CSSProperties>(() => {
    return {
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      gridAutoRows: `${rowHeight}px`,
      gap: `${gap}px`,
      position: 'relative',
    };
  }, [cols, rowHeight, gap]);

  return (
    <div
      ref={gridRef}
      style={gridStyle}
      className={className}
      onPointerMove={handleDragMove}
      onPointerUp={handleDragEnd}
      onPointerCancel={handleDragEnd}
    >
      {widgets.map((w) => (
        <div
          key={w.id}
          style={{
            gridColumn: `${w.col + 1} / span ${w.colSpan}`,
            gridRow: `${w.row + 1} / span ${w.rowSpan}`,
            minHeight: rowHeight,
            visibility: draggingId === w.id ? 'hidden' : 'visible',
          }}
          onPointerDown={(e) => handleDragStart(e, w)}
        >
          {renderWidget(w)}
        </div>
      ))}

      {/* Drag preview ghost */}
      {draggingId && dragPos && previewCell && (() => {
        const w = widgets.find((x) => x.id === draggingId);
        if (!w) return null;
        const grid = gridRef.current;
        if (!grid) return null;
        const rect = grid.getBoundingClientRect();
        const cellW = (rect.width - gap * (cols - 1)) / cols;
        const left = previewCell.col * (cellW + gap);
        const top = previewCell.row * (rowHeight + gap);
        const width = w.colSpan * cellW + (w.colSpan - 1) * gap;
        const height = w.rowSpan * rowHeight + (w.rowSpan - 1) * gap;
        return (
          <div
            style={{
              position: 'absolute',
              left,
              top,
              width,
              height,
              border: '2px dashed var(--primary)',
              borderRadius: 'var(--radius-xl)',
              backgroundColor: 'hsl(from var(--primary) h s l / 0.15)',
              pointerEvents: 'none',
              zIndex: 50,
            }}
          />
        );
      })()}
    </div>
  );
}

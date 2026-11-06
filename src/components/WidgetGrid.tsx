import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { WidgetLayoutItem } from '@/lib/prefs';

interface WidgetGridProps {
  cols: number;
  rowHeight: number;
  gap: number;
  widgets: WidgetLayoutItem[];
  onWidgetsChange: (widgets: WidgetLayoutItem[]) => void;
  isEditMode: boolean;
  renderWidget: (widget: WidgetLayoutItem) => ReactNode;
  className?: string;
}

interface DragSession {
  id: string;
  pointerId: number;
  grabOffsetX: number;
  grabOffsetY: number;
  initialLeft: number;
  initialTop: number;
  width: number;
  height: number;
  startX: number;
  startY: number;
  moved: boolean;
  preview: { col: number; row: number };
}

/** Fixed-size, four-column widget grid with direct, pointer-following drag feedback. */
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
  const ghostRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<DragSession | null>(null);
  const suppressClickRef = useRef(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [previewCell, setPreviewCell] = useState<{ col: number; row: number } | null>(null);

  const findNearestEmptySpot = useCallback(
    (startCol: number, startRow: number, colSpan: number, rowSpan: number, excludeId: string) => {
      const occupied = (col: number, row: number) =>
        widgets.some((widget) => {
          if (widget.id === excludeId) return false;
          return (
            col < widget.col + widget.colSpan &&
            col + colSpan > widget.col &&
            row < widget.row + widget.rowSpan &&
            row + rowSpan > widget.row
          );
        });

      const lastRow = Math.max(12, ...widgets.map((widget) => widget.row + widget.rowSpan + 4));
      let best: { col: number; row: number; distance: number } | null = null;
      for (let row = 0; row <= lastRow; row += 1) {
        for (let col = 0; col <= cols - colSpan; col += 1) {
          if (occupied(col, row)) continue;
          const distance = Math.abs(col - startCol) + Math.abs(row - startRow);
          if (
            !best ||
            distance < best.distance ||
            (distance === best.distance && (row < best.row || (row === best.row && col < best.col)))
          ) {
            best = { col, row, distance };
          }
        }
      }
      return best ? { col: best.col, row: best.row } : null;
    },
    [cols, widgets],
  );

  const updateGhostPosition = useCallback((clientX: number, clientY: number) => {
    const session = sessionRef.current;
    const ghost = ghostRef.current;
    if (!session || !ghost) return;
    ghost.style.transform = `translate3d(${clientX - session.grabOffsetX}px, ${clientY - session.grabOffsetY}px, 0)`;
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, widget: WidgetLayoutItem) => {
      if (!isEditMode || event.button !== 0) return;
      const target = event.target as HTMLElement;
      if (target.closest('[data-widget-action]')) return;

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      const rect = event.currentTarget.getBoundingClientRect();
      const session: DragSession = {
        id: widget.id,
        pointerId: event.pointerId,
        grabOffsetX: event.clientX - rect.left,
        grabOffsetY: event.clientY - rect.top,
        initialLeft: rect.left,
        initialTop: rect.top,
        width: rect.width,
        height: rect.height,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        preview: { col: widget.col, row: widget.row },
      };
      sessionRef.current = session;
      setDraggingId(widget.id);
      setPreviewCell(session.preview);
      document.body.style.userSelect = 'none';
      requestAnimationFrame(() => updateGhostPosition(event.clientX, event.clientY));
    },
    [isEditMode, updateGhostPosition],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, widget: WidgetLayoutItem) => {
      const session = sessionRef.current;
      const grid = gridRef.current;
      if (!session || !grid || session.pointerId !== event.pointerId || session.id !== widget.id) return;
      event.preventDefault();

      if (Math.hypot(event.clientX - session.startX, event.clientY - session.startY) > 4) {
        session.moved = true;
      }
      // Move the actual card synchronously; React only updates the snap preview.
      updateGhostPosition(event.clientX, event.clientY);

      const rect = grid.getBoundingClientRect();
      const cellWidth = (rect.width - gap * (cols - 1)) / cols;
      const proposedCol = Math.round(
        (event.clientX - session.grabOffsetX - rect.left) / (cellWidth + gap),
      );
      const proposedRow = Math.round(
        (event.clientY - session.grabOffsetY - rect.top) / (rowHeight + gap),
      );
      const col = Math.max(0, Math.min(cols - widget.colSpan, proposedCol));
      const row = Math.max(0, proposedRow);
      const spot = findNearestEmptySpot(col, row, widget.colSpan, widget.rowSpan, widget.id);
      if (!spot) return;
      if (spot.col !== session.preview.col || spot.row !== session.preview.row) {
        session.preview = spot;
        setPreviewCell(spot);
      }
    },
    [cols, findNearestEmptySpot, gap, rowHeight, updateGhostPosition],
  );

  const finishDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
      const session = sessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      if (!cancelled) {
        onWidgetsChange(
          widgets.map((widget) =>
            widget.id === session.id
              ? { ...widget, col: session.preview.col, row: session.preview.row }
              : widget,
          ),
        );
      }
      if (session.moved) {
        suppressClickRef.current = true;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      }
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      sessionRef.current = null;
      document.body.style.userSelect = '';
      setDraggingId(null);
      setPreviewCell(null);
    },
    [onWidgetsChange, widgets],
  );

  useEffect(
    () => () => {
      document.body.style.userSelect = '';
    },
    [],
  );

  const draggingWidget = widgets.find((widget) => widget.id === draggingId);
  const dragSession = sessionRef.current;
  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gridAutoRows: `${rowHeight}px`,
    gap: `${gap}px`,
    position: 'relative',
  };

  return (
    <div ref={gridRef} style={gridStyle} className={className}>
      {previewCell && draggingWidget && (
        <div
          aria-hidden="true"
          className="rounded-[22px] border-2 border-dashed border-white/90 bg-primary/15 shadow-inner"
          style={{
            gridColumn: `${previewCell.col + 1} / span ${draggingWidget.colSpan}`,
            gridRow: `${previewCell.row + 1} / span ${draggingWidget.rowSpan}`,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      {widgets.map((widget) => (
        <div
          key={widget.id}
          className={isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}
          style={{
            gridColumn: `${widget.col + 1} / span ${widget.colSpan}`,
            gridRow: `${widget.row + 1} / span ${widget.rowSpan}`,
            minWidth: 0,
            minHeight: 0,
            opacity: draggingId === widget.id ? 0.16 : 1,
            touchAction: isEditMode ? 'none' : 'auto',
            position: 'relative',
            zIndex: 1,
          }}
          onPointerDown={(event) => handlePointerDown(event, widget)}
          onPointerMove={(event) => handlePointerMove(event, widget)}
          onPointerUp={(event) => finishDrag(event)}
          onPointerCancel={(event) => finishDrag(event, true)}
          onClickCapture={(event) => {
            const isAction = (event.target as HTMLElement).closest('[data-widget-action]');
            if (suppressClickRef.current || (isEditMode && !isAction)) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          {renderWidget(widget)}
        </div>
      ))}

      {draggingWidget && dragSession && (
        <div
          ref={ghostRef}
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-[80] opacity-95 drop-shadow-2xl"
          style={{
            width: dragSession.width,
            height: dragSession.height,
            transform: `translate3d(${dragSession.initialLeft}px, ${dragSession.initialTop}px, 0)`,
            willChange: 'transform',
          }}
        >
          <div className="h-full w-full scale-[1.025]">{renderWidget(draggingWidget)}</div>
        </div>
      )}
    </div>
  );
}

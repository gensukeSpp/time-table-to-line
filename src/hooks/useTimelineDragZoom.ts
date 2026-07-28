import { useState, useCallback } from 'react';
// OnItemDragObjectResize 型は react-calendar-timeline の型定義に存在しないため削除

import { calculateZoomedTimeRange } from '../lib/timelineZoomUtils';

// ドラッグの感度を調整する定数
const DRAG_SENSITIVITY = 2;

export const useTimelineDragZoom = (
  initialVisibleTimeStart: number,
  initialVisibleTimeEnd: number,
  timelineWidth: number
) => {
  const [visibleTime, setVisibleTime] = useState({
    start: initialVisibleTimeStart,
    end: initialVisibleTimeEnd,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState<number | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    // Check if the drag started on an item
    const itemElement = (e.target as HTMLElement).closest('.rct-items');
    if (!itemElement) {
      // If not on an item, don't start the zoom drag
      return;
    }

    e.preventDefault();
    setIsDragging(true);
    setDragStartX(e.clientX);
    console.log(`dragStartX down: ${dragStartX}`);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!isDragging || dragStartX === null) return;

      const dragDistance = e.clientX - dragStartX;

      // 小さな動きでは更新しない
      if (Math.abs(dragDistance) < DRAG_SENSITIVITY) return;

      const newTimes = calculateZoomedTimeRange(
        { start: visibleTime.start, end: visibleTime.end },
        dragDistance,
        timelineWidth,
        -DRAG_SENSITIVITY
      );

      setVisibleTime(newTimes);
      // 継続的なズームのためにドラッグ開始点を更新
      // mouseMoveイベントが発生するたびにドラッグの開始位置を現在位置で上書きしてしまっている
      // setDragStartX(e.clientX);
      console.log(`dragStartX move: ${dragStartX}`);
    },
    [isDragging, dragStartX, visibleTime, timelineWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStartX(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // コンポーネント外にマウスが出た場合もドラッグを終了
    if (isDragging) {
      setIsDragging(false);
      setDragStartX(null);
    }
  }, [isDragging]);

  // タイムラインのスクロールイベント(onTimeChange)と連携するための関数
  const updateVisibleTime = useCallback((start: number, end: number) => {
    setVisibleTime({ start, end });
  }, []);

  return {
    visibleTimeStart: visibleTime.start,
    visibleTimeEnd: visibleTime.end,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    updateVisibleTime,
  };
};

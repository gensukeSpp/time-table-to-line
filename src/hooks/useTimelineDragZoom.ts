import { useState, useCallback, useRef } from 'react';
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

  // useRef で最新の visibleTime を保持し、handleMouseMove の依存配列から外す
  const visibleTimeRef = useRef(visibleTime);
  visibleTimeRef.current = visibleTime;

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    // イベントアイテム上でのクリックはズーム開始しない
    const itemElement = (e.target as HTMLElement).closest('.rct-item');
    if (itemElement) {
      return;
    }

    e.preventDefault();
    setIsDragging(true);
    setDragStartX(e.clientX);

  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!isDragging || dragStartX === null) return;

      const dragDistance = e.clientX - dragStartX;

      // 小さな動きでは更新しない
      if (Math.abs(dragDistance) < DRAG_SENSITIVITY) return;

      const { start, end } = visibleTimeRef.current;
      const newTimes = calculateZoomedTimeRange(
        { start, end },
        dragDistance,
        timelineWidth,
        -DRAG_SENSITIVITY
      );

      setVisibleTime(newTimes);
      // 継続的なズームのためにドラッグ開始点を更新
      setDragStartX(e.clientX);

    },
    [isDragging, dragStartX, timelineWidth]
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
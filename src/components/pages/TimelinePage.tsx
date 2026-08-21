import { addHours } from 'date-fns';
import React, { useRef, useLayoutEffect, useMemo, useState } from 'react';
import { Timeline, TimelineGroupBase } from "react-calendar-timeline";

import { useGroupUsersQuery, useAuthQuery } from "../../resources/queries";
import { useAuthContext, useEventsState } from "../../hooks/useContextFamily";
import { useTimelineDragZoom } from '../../hooks/useTimelineDragZoom'; // Import the new custom hook
import { getGroup, getItems, toTimelineStackItems } from '../../lib/TmelineData';

import 'react-calendar-timeline/style.css';

export const GroupHorizonTimeline = () => {
  const { data: groupUsers, isPending } = useGroupUsersQuery();
  const groupMember: TimelineGroupBase[] = getGroup(groupUsers?.data);

  const authState = useAuthContext();
  const tokenContext = authState.type === 'token' ? authState.accessToken : undefined;
  useAuthQuery(tokenContext!);

  const stateAll = useEventsState();
  const state = getItems(stateAll);

  // Container ref to get timeline width
  const containerRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);
  // <Timeline> の resize() を非表示→表示の切り替え(タブ切替)時に呼ぶための把持。
  // react-calendar-timeline は window resize 時のみ幅を再測定するため、Mantine Tabs の
  // keepMounted で非表示のままマウントされると canvas 幅(buffer込み)が初期値=1000*3=3000px 等に
  // 固定され、DevTools 開き(実 resize)まで修復されない(引用: Issue#11 Issue 2)。
  const timelineRef = useRef<{ resize?: () => void } | null>(null);

  // コンテナ幅(ドラッグズーム用)とライブラリ幅を確実に再測定する。
  // ResizeObserver は display:none→block などコンテナのサイズ変化(0→実値)を検知するため、
  // タブを開いた瞬間に width を更新し、<Timeline>.resize() で canvas を再計算させる。
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const update = () => {
      setTimelineWidth(el.offsetWidth);
      timelineRef.current?.resize?.();
    };

    update();

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(el);

    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  // ライブラリの resizeDetector 契約: addListener(インスタンス)/removeListener()。
  // addListener で受け取ったインスタンスの .resize() が実レイアウト幅を再測定する。
  const resizeDetector = useMemo(
    () => ({
      addListener: (instance: unknown) => {
        timelineRef.current = instance as { resize?: () => void };
      },
      removeListener: () => {
        timelineRef.current = null;
      },
    }),
    []
  );

  const defaultTimeStart = addHours(new Date(), -12).getTime();
  const defaultTimeEnd = addHours(new Date(), 12).getTime();

  const {
    visibleTimeStart,
    visibleTimeEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    updateVisibleTime
  } = useTimelineDragZoom(
    defaultTimeStart,
    defaultTimeEnd,
    timelineWidth
  );

  const onBoundsChange = () => {};

  // onTimeChange handler to sync scrolling with our zoom state
  const handleTimeChange = (
    visibleTimeStart: number,
    visibleTimeEnd: number,
    updateScrollCanvas: (start: number, end: number) => void
  ) => {
    updateVisibleTime(visibleTimeStart, visibleTimeEnd);
    updateScrollCanvas(visibleTimeStart, visibleTimeEnd);
  };


  return (
    // Add a container div with a ref and mouse event handlers
    <div
      ref={containerRef}
      onMouseDownCapture={handleMouseDown}
      onMouseMoveCapture={handleMouseMove}
      onMouseUpCapture={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <p>グループタイムライン</p>
      {/* Remove ZoomControl */}
      {isPending ? <p>Loading...</p> : (
        <Timeline
          groups={groupMember}
          items={toTimelineStackItems(state)}
          defaultTimeStart={defaultTimeStart}
          defaultTimeEnd={defaultTimeEnd}
          visibleTimeStart={visibleTimeStart} // Use state from hook
          visibleTimeEnd={visibleTimeEnd}     // Use state from hook
          onTimeChange={handleTimeChange} // Use our combined handler
          canMove={false} // Disable item move
          canResize={false} // Disable item resize
          minZoom={24 * 60 * 60 * 1000}
          maxZoom={365.24 * 86400 * 1000}
          lineHeight={60}
          stackItems={true} // Stack overlapping items vertically
          onCanvasClick={() => { }}
          onBoundsChange={onBoundsChange}
          resizeDetector={resizeDetector}
        />
      )}
    </div>
  )
}

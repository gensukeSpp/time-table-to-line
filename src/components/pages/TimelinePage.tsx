import { addHours } from 'date-fns';
import React, { useRef, useLayoutEffect, useMemo, useState } from 'react';
import { Timeline, TimelineGroupBase, Id } from "react-calendar-timeline";

import { useGroupUsersQuery } from "../../resources/queries";
import { useEventsState } from "../../hooks/useContextFamily";
import { useAuthInfo } from '../../hooks/useAuthGuard';
import { useTimelineDragZoom } from '../../hooks/useTimelineDragZoom'; // Import the new custom hook
import { getGroup, getItems, toTimelineStackItems } from '../../lib/TmelineData';
import { TimelineEventProps } from '../../lib/TimelineType';
import { EventDetailOverlay } from '../organisms/EventDetailOverlay';
import { MilestoneList } from '../organisms/MilestoneList';
import { MilestoneAddButton } from '../organisms/MilestoneAddButton';
import { toolbar } from './TimelinePage.css';

import 'react-calendar-timeline/style.css';

// クリックしたイベント付近にオーバーレイを重ねる位置を、コンテナ基準で計算する。
// e.currentTarget が null（React 19 等）の場合はフォールバック位置へ倒す。
const computeOverlayPos = (
  e: React.SyntheticEvent,
  containerRef: React.RefObject<HTMLDivElement | null>
): { top: number; left: number } => {
  const container = containerRef.current;
  const target = e.currentTarget as HTMLElement | null;
  if (!container || !target) {
    return { top: 12, left: 12 };
  }
  const item = target.getBoundingClientRect();
  const cont = container.getBoundingClientRect();
  const top = Math.min(item.bottom - cont.top + 8, cont.height - 220);
  const left = Math.min(Math.max(item.left - cont.left, 0), cont.width - 340);
  return { top: Math.max(top, 8), left: Math.max(left, 8) };
};

export const GroupHorizonTimeline = () => {
  const { data: groupUsers, isPending } = useGroupUsersQuery();
  const groupMember: TimelineGroupBase[] = getGroup(groupUsers?.data);

  const stateAll = useEventsState();
  const state = getItems(stateAll);

  // グループ管理者かどうかは /timetable/inquiry のレスポンス（JWT クレーム由来）の admin で判定する。
  const authInfo = useAuthInfo();
  const isAdmin = authInfo.type === 'auth' ? authInfo.admin : false;

  // Container ref to get timeline width
  const containerRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);

  // イベントクリックで開く詳細オーバーレイ（Issue #20）
  const authId = authInfo.type === 'auth' ? authInfo.authId : undefined;
  const [selectedEvent, setSelectedEvent] = useState<TimelineEventProps | null>(null);
  const [overlayPos, setOverlayPos] = useState<{ top: number; left: number } | null>(null);
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

  // イベントクリックで詳細オーバーレイを開く（管理者 OR 自分のイベントのみ）
  const handleItemClick = (itemId: Id, e: React.SyntheticEvent, _time: number) => {
    const event = state.find((evt) => evt.id === itemId);
    if (!event) return;
    // 一般ユーザーには他メンバーの詳細を表示しない（{admin & ...}）
    if (!(isAdmin || authId === event.staff_id)) return;
    setSelectedEvent(event);
    setOverlayPos(computeOverlayPos(e, containerRef));
  };

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
    <>
      {/* マイルストーン操作エリア（タイムライン本体の外に置き、幅測定に影響させない） */}
      <div className={toolbar}>
        <MilestoneList />
        <MilestoneAddButton admin={isAdmin} />
      </div>
      {/* Add a container div with a ref and mouse event handlers */}
      <div
        ref={containerRef}
        style={{ position: 'relative' }}
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
            onItemClick={handleItemClick}
            onBoundsChange={onBoundsChange}
            resizeDetector={resizeDetector}
          />
        )}
      </div>
      {selectedEvent && overlayPos && (
        <EventDetailOverlay
          event={selectedEvent}
          position={overlayPos}
          // タイムライン詳細モーダルは常に閲覧専用（編集は Calendar 側で行う）
          readOnly={true}
          onClose={() => {
            setSelectedEvent(null);
            setOverlayPos(null);
          }}
        />
      )}
    </>
  )
}

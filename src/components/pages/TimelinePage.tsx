import { addHours, addDays } from 'date-fns';
import React, { useRef, useEffect, useState } from 'react'; // Import useRef, useEffect, useState
import { Timeline, TimelineGroupBase } from "react-calendar-timeline";

import { useGroupUsersQuery, useAuthQuery } from "../../resources/queries";
import { useAuthContext, useEventsState } from "../../hooks/useContextFamily";
import { useTimelineDragZoom } from '../../hooks/useTimelineDragZoom'; // Import the new custom hook
import { getGroup, getItems } from '../../lib/TmelineData';

import 'react-calendar-timeline/style.css';
import { TimelineEventProps } from '../../lib/TimelineType';

export const MyHorizonTimeline = () => {
  const { data: groupUsers, isPending } = useGroupUsersQuery();
  const groupMember: TimelineGroupBase[] = getGroup(groupUsers?.data);

  const authState = useAuthContext();
  const tokenContext = authState.type === 'token' ? authState.accessToken : undefined;
  const { data: yourInfo } = useAuthQuery(tokenContext!);
  const strYourInfo = JSON.stringify(yourInfo?.data);

  const stateAll = useEventsState();
  const state = getItems(stateAll);

  // Container ref to get timeline width
  const containerRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);

  useEffect(() => {
    if (containerRef.current) {
      setTimelineWidth(containerRef.current.offsetWidth);
    }
  }, []); // Runs once on mount

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

  const onBoundsChange = (canvasTimeStart: number, canvasTimeEnd: number) => {
    // updateVisibleTime(canvasTimeStart, canvasTimeEnd);
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
    // Add a container div with a ref and mouse event handlers
    <div
      ref={containerRef}
      onMouseDownCapture={handleMouseDown}
      onMouseMoveCapture={handleMouseMove}
      onMouseUpCapture={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <p>マイタイムライン</p>
      {/* Remove ZoomControl */}
      {isPending ? <p>Loading...</p> : (
        <Timeline
          groups={groupMember}
          items={state.map((item) => {
            return {
              ...item,
            }
          })}
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
          onCanvasClick={(groupId, time, e) => { }}
          onBoundsChange={onBoundsChange}
        />
      )}
    </div>
  )
}


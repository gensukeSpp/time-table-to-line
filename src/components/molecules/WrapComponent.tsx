import { CSSProperties, ComponentPropsWithRef, PropsWithChildren, useRef } from 'react';

import { Components, EventWrapperProps, EventProps } from 'react-big-calendar';

import { TimelineEventProps } from "../../lib/TimelineType";

type ComponentWithChildrenProps = PropsWithChildren<EventWrapperProps<TimelineEventProps>>
export const CustomEventWrapper: React.FC<ComponentWithChildrenProps> = (props) => {
  const { event, onClick, onDoubleClick, style } = props;

  const getterMaybeProp = props.getters.eventProp;
  const getterProp = getterMaybeProp && getterMaybeProp(event, event.start!, event.end!, false);
  const ref = useRef<HTMLDivElement>(null);
  const elm = ref.current?.querySelector('.rbc-event');

  const wrapperStyle: CSSProperties = {
    width: 'fit-content',
    height: '100%',
    outline: '2px solid orange',
    outlineOffset: '2px',
  }
  const nextStyle: CSSProperties = {
    width: '100%',
    height: `${elm?.clientHeight}px`,
    outline: '2px solid orange',
    outlineOffset: '2px',
    boxSizing: 'border-box',
    position: 'absolute',
    top: `${style?.top}%`,
  }

  const handleCapture = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    // ID違いのフォーム表示
    if(!(e.target instanceof HTMLButtonElement)){
      return;
    }
    onClick(e);
    alert('受け取りました');
  }

  return (
      <button style={nextStyle} onClick={(e) => handleCapture(e)}>
        {props.children}
      </button>
  );
}

export const CustomEventCard: React.FC<EventProps<TimelineEventProps>> = (props) => {
  return (
    <div id="custum-card">{props.event.title}</div>
  );
}

import { CSSProperties, ComponentPropsWithRef, PropsWithChildren, useRef } from 'react';

import { Components, EventWrapperProps, EventProps } from 'react-big-calendar';

import { TimelineEventProps } from "../../lib/TimelineType";


// React component type in TypeScript
// https://stackoverflow.com/questions/56947690/react-component-type-in-typescript

type ComponentWithChildrenProps = PropsWithChildren<EventWrapperProps<TimelineEventProps>>
export const CustomEventWrapper: React.FC<ComponentWithChildrenProps> = (props) => {
  const { event, onClick, onDoubleClick, style } = props;

  const getterMaybeProp = props.getters.eventProp;
  const getterProp = getterMaybeProp && getterMaybeProp(event, event.start!, event.end!, false);
  getterProp && console.log(`Getter prop: ${JSON.stringify(getterProp)}`);
	// const { data } = useSearchQuery('userID');

  const ref = useRef<HTMLDivElement>(null);
  const elm = ref.current?.querySelector('.rbc-event');
  // view-portからの座標、今回使わない
  // console.log(`Role button div: ${JSON.stringify(elm?.getBoundingClientRect())}`);
  // const childRefTop = elm?.getBoundingClientRect().top;

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
    // console.log('Capture event: ', e);
    if(!(e.target instanceof HTMLButtonElement)){
      return;
    }
    onClick(e);
    alert('受け取りました');
  }

  return (
      <button style={nextStyle} onClick={(e) => handleCapture(e)}>
        {/* <button onClick={(e) => handleCapture(e)}></button> */}
        {props.children}
      </button>
  );
}

export const CustomEventCard: React.FC<EventProps<TimelineEventProps>> = (props) => {
  return (
    <div id="custum-card">{props.event.title}</div>
  );
}

import { Event, SlotInfo } from 'react-big-calendar';
import { TimelineItemBase as TimelineItem } from 'react-calendar-timeline';

export interface EventItem extends Event {
	staff_id: number,
	summary?: string,
	progress?: string
}

type Merge<T, U> = Omit<T, keyof U> & U

type NewTimelineItem = Omit<TimelineItem<Date> & EventItem,
	'title' | 'start_time' | 'end_time'>

export type TimelineEventProps = Merge<NewTimelineItem, {
	title: React.ReactNode;
	start_time: Date;
	end_time: Date;
	isDraggable?: boolean;
}>;

export type GroupUserProps = {
	staff_id: number;
	family_kana: string;
	last_kana: string;
}

// ここから、認証Prop
export type AuthInfoProp =
	{ type: 'auth'; authId: number; code: number; group: string }
	| { type: 'token'; accessToken: string };

export interface EventFormProps {
	targetEvent?: TimelineEventProps,
	onShowFormView: (targetEvent: TimelineEventProps) => void
}

export interface ChangingButtonProp {
	timeChangeEvents: TimelineEventProps[],
}

export interface CalendarActionProps {
	onTimeChangeEvents?: (movedEvents: TimelineEventProps[]) => void
	onSlotInfo?: (selectedSlot: SlotInfo) => void
}

// type alias を定義するか
export type TimelineStackItem = Omit<TimelineEventProps, 'start_time' | 'end_time'> & {
	start_time: number;
	end_time: number;
};

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
	admin: boolean;
	milestone_id?: number | null;
	completed?: boolean;
}>;

export type MilestoneStatus = 'open' | 'waiting' | 'closed';

export interface MilestoneProps {
	id: number;
	staff_id: number;
	title: string;
	description?: string | null;
	color: string;
	status: MilestoneStatus;
	created_at: string | null;
	guideline_end_date?: string | null;
	accomplished_date?: string | null;
}

export type GroupUserProps = {
	staff_id: number;
	family_kana: string;
	last_kana: string;
}

// ここから、認証Prop
export type AuthInfoProp =
	{ type: 'auth'; authId: number; code: number; group: string; admin: boolean }
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

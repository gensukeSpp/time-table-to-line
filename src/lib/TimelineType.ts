import { Event, SlotInfo, View } from 'react-big-calendar';
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
	// Issue #44: 進捗の「未定」を表すため null を許容する（送信時は明示的 null、
	// バックエンド EventUpdate.progress: str | None と整合）。in-memory では undefined も許容。
	progress?: string | null;
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
	onSlotInfo?: (selectedSlot: SlotInfo, view: View) => void
}

// type alias を定義するか
export type TimelineStackItem = Omit<TimelineEventProps, 'start_time' | 'end_time'> & {
	start_time: number;
	end_time: number;
};

// /milestone/{id}/events レスポンス要素（EventORM.to_dict() + group_name、Issue #40）
export interface MilestoneEventProps {
	id: number;
	staff_id: number;
	group: number;
	group_name: string | null;
	start: string;
	end: string;
	title: string;
	summary?: string | null;
	progress?: string | null;
	milestone_id: number | null;
	completed: boolean;
}

export type ProgressGroupKey = 'これから' | 'まだ' | 'もうすぐ' | '完了' | '指定なし';

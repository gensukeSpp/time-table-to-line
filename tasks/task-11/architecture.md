# アーキテクチャ — task-11: PR #21 の ts/tsx 限定部分的取り込み

> PR #21 マージ後の main 側コードを「正」とし、本ブランチ（release 系・マイルストーン未通過）に移植する。
> 違いがある箇所は本書に明記する。コード例はすべて main 最終形をベースに本ブランチ向け調整済み。

## 1. 型・認証（admin 伝播 3 点セット）

### `src/lib/authPayload.ts`（変更）

`InquiryStaff` に `admin` を追加し、正規化関数で伝播させる。

```ts
export type InquiryStaff = {
  staff_id: number;
  group_id: number;
  group_name: string;
  admin: boolean;   // ← 追加
};
```

`normalizeAuthPayload` の戻り値オブジェクトに追加:

```ts
  return {
    staff_id,
    group_id: Number(inner.group_id ?? inner.code ?? 0),
    group_name: String(inner.group_name ?? inner.group ?? ''),
    admin: Boolean(inner.admin ?? false),   // ← 追加
  };
```

本ブランチ版は `inner` の解決（string JSON / ネスト / authId 別名対応）を既に持つため、**その構造を保持したまま上記 1 行のみ追加**する。

### `src/lib/TimelineType.ts`（変更）

```ts
export type AuthInfoProp =
  { type: 'auth'; authId: number; code: number; group: string; admin: boolean }
  | { type: 'token'; accessToken: string };
```

### `src/hooks/useAuthGuard.ts`（変更）

auth 戻り値に追加（`admin` は `/timetable/inquiry` の JWT クレーム由来。イベント側 `admin` フラグは常に false なので使わない）:

```ts
    return {
      authId: payload.staff_id,
      code: payload.group_id,
      group: payload.group_name,
      admin: payload.admin,   // ← 追加
      type: 'auth',
    };
```

> 注意: `admin` 追加により `AuthInfoProp` auth 型の全生成箇所が型エラーになる。
> 本ブランチで auth 型を生成しているのは `useAuthGuard.ts` のみ（grep で確認済み）。
> `src/lib/SampleState.ts` の `exAuthToken` / `exAuthUser` は token 型 / Storybook 用のため影響を確認すること（必要なら `admin: false` を補う）。

## 2. `AddChildForm` の読取専用モード（`src/components/organisms/InputItem.tsx`）

### Props

```ts
interface InputEventProps {
	selectedEvent: TimelineEventProps,
	closeClick: () => void,
	// 無条件に編集不可とするモード（Issue #20 / PR #21 レビュー指摘）。
	// タイムライン詳細モーダルは閲覧専用とし、イベント編集は Calendar 側で行う。
	// true の場合は自分のイベントでも更新 / 削除ボタンを表示しない。
	readOnly?: boolean
}
```

### コンポーネント内

```ts
import { useGroupUsersQuery } from '../../resources/queries';  // 追加

export const AddChildForm = forwardRef(
	({selectedEvent, closeClick, readOnly}: InputEventProps,
		childRef: Ref<HTMLDivElement>) => {
	...
	const auth = useAuthInfo();
	const authId = auth.type === 'auth' ? auth.authId : undefined;
	const isOwnEvent = authId === selectedEvent.staff_id;
	// readOnly は無条件に編集不可（admin / 自分のイベントは問わない）
	const readOnlyMode = readOnly === true;

	// グループメンバー名の解決（読取専用時に staff_id 数値の代わりに表示）
	const { data: groupUsers } = useGroupUsersQuery();
	const member = groupUsers?.data?.find((u) => u.staff_id === selectedEvent.staff_id);
	const memberName = member ? `${member.family_kana ?? ''}${member.last_kana ?? ''}` : '不明';
```

`readOnlyMode` が true のときは早期 return で閲覧専用 UI（閉じるボタン / メンバー名 / タイトル / 内容 / どんな感じ を Text 表示）を返す。編集側は `authId === selectedEvent.staff_id` を `isOwnEvent` に置き換えるだけ（挙動不変）。

main 最終形の全文は `/tmp/pr21-InputItem.tsx` に取得済み（実装時に参照）。差分は `readOnly` ブロック追加・`useGroupUsersQuery` import・`isOwnEvent` 置換・コメント更新のみ。

## 3. オーバーレイコンポーネント（新規 2 ファイル）

### `src/components/organisms/EventDetailOverlay.css.ts`

```ts
import { style } from '@vanilla-extract/css';

export const overlay = style({
  position: 'absolute',
  zIndex: 100,
  maxWidth: '320px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  background: '#fff',
});
```

### `src/components/organisms/EventDetailOverlay.tsx`

main 最終形（外クリック + Escape close 付き）をそのまま新規作成する:

```tsx
import { useEffect, useRef } from 'react';
import { Box } from '@mantine/core';
import { TimelineEventProps } from '../../lib/TimelineType';
import { AddChildForm } from './InputItem';
import { overlay } from './EventDetailOverlay.css';

interface EventDetailOverlayProps {
  event: TimelineEventProps;
  position: { top: number; left: number };
  readOnly: boolean;
  onClose: () => void;
}

export const EventDetailOverlay = ({ event, position, readOnly, onClose }: EventDetailOverlayProps) => {
  const rootRef = useRef<HTMLDivElement>(null);

  // モーダルの自然な閉じ操作（PR #21 レビュー指摘）:
  // - オーバーレイ外クリックで閉じる
  // - Escape キーで閉じる
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <Box ref={rootRef} className={overlay} style={{ top: position.top, left: position.left }}>
      <AddChildForm selectedEvent={event} closeClick={onClose} readOnly={readOnly} />
    </Box>
  );
};
```

> ファイル末尾に改行を付ける（PR #21 の元ファイルは改行なし。lint 対策）。

## 4. Timeline 組み込み（`src/components/pages/TimelinePage.tsx`）

本ブランチ版への追加（Milestone 関連は本ブランチに存在しないため**取り込まない**）:

### import 追加

```ts
import { Timeline, TimelineGroupBase, Id } from "react-calendar-timeline";  // Id を追加
import { useAuthInfo } from '../../hooks/useAuthGuard';                     // 追加
import { TimelineEventProps } from '../../lib/TimelineType';                // 追加
import { EventDetailOverlay } from '../organisms/EventDetailOverlay';       // 追加
```

### `computeOverlayPos`（コンポーネント外、ファイル冒頭）

```ts
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
```

### コンポーネント内 state

```ts
  // グループ管理者かどうかは /timetable/inquiry のレスポンス（JWT クレーム由来）の admin で判定する。
  const authInfo = useAuthInfo();
  const isAdmin = authInfo.type === 'auth' ? authInfo.admin : false;

  // イベントクリックで開く詳細オーバーレイ（Issue #20）
  const authId = authInfo.type === 'auth' ? authInfo.authId : undefined;
  const [selectedEvent, setSelectedEvent] = useState<TimelineEventProps | null>(null);
  const [overlayPos, setOverlayPos] = useState<{ top: number; left: number } | null>(null);
```

> 本ブランチ版は既存の `authState = useAuthContext()` / `useAuthQuery(tokenContext!)` を維持してよい。
> `useAuthInfo()` は内部で同じ `authKeys.verify(token)` query を叩くため、二重 fetch はキャッシュで吸収される。

### `handleItemClick`

```ts
  // イベントクリックで詳細オーバーレイを開く（管理者 OR 自分のイベントのみ）
  const handleItemClick = (itemId: Id, e: React.SyntheticEvent, _time: number) => {
    const event = state.find((evt) => evt.id === itemId);
    if (!event) return;
    // 一般ユーザーには他メンバーの詳細を表示しない（{admin & ...}）
    if (!(isAdmin || authId === event.staff_id)) return;
    setSelectedEvent(event);
    setOverlayPos(computeOverlayPos(e, containerRef));
  };
```

### JSX 変更

1. コンテナ `div` に `style={{ position: 'relative' }}` を追加
2. `<Timeline>` に `onItemClick={handleItemClick}` を追加
3. `</div>` の後にオーバーレイ描画を追加:

```tsx
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
```

return を `<>...</>` フラグメントに包む必要がある（現状は単一 div を返すため）。

## 5. 変更対象ファイル一覧

| ファイル | 変更種別 |
|---------|---------|
| `src/lib/authPayload.ts` | 修改（admin 追加） |
| `src/hooks/useAuthGuard.ts` | 修改（admin 伝播） |
| `src/lib/TimelineType.ts` | 修改（AuthInfoProp admin 追加） |
| `src/components/organisms/EventDetailOverlay.tsx` | 新規 |
| `src/components/organisms/EventDetailOverlay.css.ts` | 新規 |
| `src/components/organisms/InputItem.tsx` | 修改（readOnly + メンバー名解決） |
| `src/components/pages/TimelinePage.tsx` | 修改（onItemClick + オーバーレイ） |
| `src/tests/InputItem.spec.tsx` | 新規 |
| `src/tests/EventDetailOverlay.spec.tsx` | 新規 |

## 6. 既存 Calendar（個人）への影響

`AddChildForm` は Calendar 側から `readOnly` 未指定で呼ばれるため、`readOnlyMode = false` となり従来挙動を完全維持する。`CalendarView.tsx` は変更なし。

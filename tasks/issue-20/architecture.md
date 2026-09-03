# アーキテクチャ — タイムライン詳細モーダル

この文書は、タイムライン（グループ）画面で管理者が他メンバーのイベント詳細を**読取専用**で閲覧できる詳細モーダルを実現するための設計。既存の `AddChildForm`（`src/components/organisms/InputItem.tsx`）を使い回し、管理者の読取専用モードを追加する。**本 Issue はフロントエンドのみ**で、バックエンドは既存契約をそのまま利用する。

## 1. 現状の把握（前提）

### 1-1. Calendar（個人）側の詳細フォーム

`AddChildForm` は `CalendarView.tsx`（`src/components/pages/CalendarView.tsx:159-161`）で `EditForm` に包まれて表示される。

- `AddChildForm` は `forwardRef`（`InputEventProps`）で、`childRef` を `divRef` に束ねて `scrollIntoView` する
- 上部に「閉じる」ボタン、`selectedEvent.staff_id` を**数値のまま**表示（`InputItem.tsx:52`）
- `authId === selectedEvent.staff_id` のときのみ `EventUpdateButtons`（更新 / 削除）を表示（`InputItem.tsx:67-71`）
- 非自分のイベントでは「異なるスタッフの、変更はできません」`Dialog` を表示（`InputItem.tsx:74-78`）

### 1-2. Timeline（グループ）側の現状

- `GroupHorizonTimeline`（`src/components/pages/TimelinePage.tsx`）が `react-calendar-timeline` の `Timeline` を描画
- `canMove={false} canResize={false}`（アイテム移動・リサイズ無効）。**現状 `onItemClick` なし**
- `isAdmin = authInfo.type === 'auth' ? authInfo.admin : false`（`TimelinePage.tsx:24-25`）
- 行グループ = `staff_id`（`src/lib/TmelineData.ts:12-16` の `getGroup` が `staff_id` を id に）
- `onItemClick?(itemId: Id, e: React.SyntheticEvent, time: number)` が `Timeline` に用意されている（`node_modules/react-calendar-timeline/dist/lib/Timeline.d.ts:58`）

## 2. AddChildForm の拡張（`src/components/organisms/InputItem.tsx`）

新規に **optional** プロップ `readOnly?: boolean` を追加する。未指定（Calendar 側）は従来挙動を完全維持する。

### 2-1. インターフェース

```ts
interface InputEventProps {
  selectedEvent: TimelineEventProps,
  closeClick: () => void,
  readOnly?: boolean,      // 追加: タイムラインの管理者読取専用モード
}
```

### 2-2. 内部判定

```ts
const auth = useAuthInfo();
const authId = auth.type === 'auth' ? auth.authId : undefined;
const isAdmin = auth.type === 'auth' ? auth.admin : false;
const isOwnEvent = authId === selectedEvent.staff_id;
// 読取専用モード: readOnly 指定 && 自分のイベントではない
const readOnlyMode = readOnly === true && !isOwnEvent;
```

> 自分のイベントは常に編集可能（従来どおり更新 / 削除ボタン表示）。`readOnly` 指定があっても自分のイベントでは編集 UI に倒す（実装要件 3「自分のイベントはそのままの表記で良い」）。

### 2-3. メンバー名の解決

`useGroupUsersQuery()` を追加し、`readOnlyMode` のとき `staff_id` 数値の代わりにメンバー名を表示する。

```ts
const { data: groupUsers } = useGroupUsersQuery();
const member = groupUsers?.data?.find((u) => u.staff_id === selectedEvent.staff_id);
const memberName = member ? `${member.family_kana ?? ''}${member.last_kana ?? ''}` : '不明';
```

### 2-4. 描画分岐

`readOnlyMode` のとき:
- `selectedEvent.staff_id` の代わりに `memberName` を表示（`InputItem.tsx:52` を分岐）
- `summary` / `progress` は**読取専用 Text** で表示（`TextInput` / `NativeSelect` を出さない）
- `EventUpdateButtons`（更新 / 削除）を**表示しない**
- 「異なるスタッフの、変更はできません」`Dialog` を**表示しない**（管理者の読取専用なので警告不要）

それ以外（従来）:
- 現在の挙動をそのまま維持

```tsx
{readOnlyMode ? (
  <Box ref={childRef} className={formParent}>
    <Button color="green" onClick={closeClick} className={buttonPosition}>
      <Text style={{ fontSize: '2rem' }} c="white">×</Text><Text c="white">閉じる</Text>
    </Button>
    <Text style={{ fontSize: '2rem' }} fw={700}>{memberName}</Text>
    <Text style={{ fontSize: '2rem' }} fw={700} className={boundaryTop}>{selectedEvent.title}</Text>
    <section className={boundaryTop}>
      <Text>内容：</Text>
      <Text>{selectedEvent.summary ?? ''}</Text>
    </section>
    <section className={boundaryTop}>
      <Text>どんな感じ：</Text>
      <Text>{selectedEvent.progress ?? ''}</Text>
    </section>
  </Box>
) : (
  // 既存の編集フォーム（現在の return をそのまま）
)}
```

> `useGroupUsersQuery` の追加 import と `useDialog` の警告ダイアログは `readOnlyMode` のとき描画しない。

## 3. Timeline 側の組み込み（`src/components/pages/TimelinePage.tsx`）

`Timeline` に `onItemClick` を追加し、詳細モーダル（オーバーレイ）を開く。**開く条件は `isAdmin || 自分のイベント`**（一般ユーザーには他メンバー詳細を表示しない）。

```tsx
const authInfo = useAuthInfo();
const isAdmin = authInfo.type === 'auth' ? authInfo.admin : false;
const authId = authInfo.type === 'auth' ? authInfo.authId : undefined;

// オーバーレイの表示状態
const [selectedEvent, setSelectedEvent] = useState<TimelineEventProps | null>(null);
const [overlayPos, setOverlayPos] = useState<{ top: number; left: number } | null>(null);

const handleItemClick = (
  itemId: Id,
  e: React.SyntheticEvent,
  _time: number
) => {
  const event = state.find((evt) => evt.id === itemId);
  if (!event) return;
  // 管理者 OR 自分のイベント のみ詳細を開く（{admin & ...}）
  if (!(isAdmin || authId === event.staff_id)) return;

  setSelectedEvent(event);
  setOverlayPos(computeOverlayPos(e, containerRef));
};
```

- `state = getItems(stateAll)`（既存のアプリイベント一覧。`TimelinePage.tsx:21`）
- `Id` は `react-calendar-timeline` の型（`import { Timeline, TimelineGroupBase, Id } from "react-calendar-timeline"`）
- `containerRef` は既存の `useRef<HTMLDivElement>(null)` を再利用

`<Timeline>` に追加:

```tsx
<Timeline
  ...
  stackItems={true}
  onCanvasClick={() => { }}
  onItemClick={handleItemClick}
  ...
/>
```

`Timeline` の外（`</div>` の後）にオーバーレイを描画:

```tsx
{selectedEvent && overlayPos && (
  <EventDetailOverlay
    event={selectedEvent}
    position={overlayPos}
    onClose={() => {
      setSelectedEvent(null);
      setOverlayPos(null);
    }}
    readOnly={isAdmin}   // 管理者は他メンバーを読取専用で見る（AddChildForm 内で自分のイベントは編集に倒す）
  />
)}
```

## 4. オーバーレイコンポーネント（`src/components/organisms/EventDetailOverlay.tsx`）

新規。`AddChildForm` を絶対配置する薄いラッパー。`AddChildForm` は `forwardRef` なので `ref` を受ける（`divRef` 相当の `scrollIntoView` はタイムラインでは不要だが、`AddChildForm` は `childRef` を受ける契約なので `ref` を渡す）。

```tsx
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

export const EventDetailOverlay = ({ event, position, readOnly, onClose }: EventDetailOverlayProps) => (
  <Box className={overlay} style={{ top: position.top, left: position.left }}>
    <AddChildForm selectedEvent={event} closeClick={onClose} readOnly={readOnly} />
  </Box>
);
```

スタイル（`EventDetailOverlay.css.ts`、Vanilla Extract）:

```ts
import { style } from '@vanilla-extract/css';

export const overlay = style({
  position: 'absolute',
  zIndex: 100,             // タイムライン本体より前面に重ねる
  maxWidth: '320px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  background: '#fff',
});
```

## 5. オーバーレイ位置の計算（`computeOverlayPos`）

クリックされたイベント要素 `e.currentTarget` の **bounding rect** を、`containerRef` の **bounding rect** を基準にして相対位置に変換する。

```ts
const computeOverlayPos = (
  e: React.SyntheticEvent,
  containerRef: React.RefObject<HTMLDivElement | null>
): { top: number; left: number } => {
  const container = containerRef.current;
  const target = e.currentTarget as HTMLElement | null;
  if (!container || !target) {
    // フォールバック: currentTarget が null（React 19 等）の場合はタイムライン上部右寄り
    return { top: 12, left: 12 };
  }
  const item = target.getBoundingClientRect();
  const cont = container.getBoundingClientRect();
  // イベント要素のすぐ下、コンテナ内に収まるようにする
  const top = Math.min(item.bottom - cont.top + 8, cont.height - 220);
  const left = Math.min(Math.max(item.left - cont.left, 0), cont.width - 340);
  return { top: Math.max(top, 8), left: Math.max(left, 8) };
};
```

- `e.currentTarget` はクリックされたイベント DOM 要素（`Item` の div）。`onItemClick` から渡される `e` は `React.SyntheticEvent`。実ブラウザで位置が狂う場合は `test-plan.md` §4 の確認手順で検証し、フォールバック / クランプ調整を行う。
- `onItemClick` 内で `timeFromItemEvent(e)` 相当の座標取得より、`currentTarget` の rect が「イベント直下に重ねる」目的に最も適する。

## 6. 変更対象ファイル（見込み）

| ファイル | 変更 |
|---------|------|
| `src/components/organisms/InputItem.tsx` | `readOnly` プロップ追加、`useGroupUsersQuery` 追加、読取専用モード分岐 |
| `src/components/organisms/EventDetailOverlay.tsx`（新規） | `AddChildForm` を絶対配置するラッパー |
| `src/components/organisms/EventDetailOverlay.css.ts`（新規） | オーバーレイスタイル（absolute, zIndex, shadow） |
| `src/components/pages/TimelinePage.tsx` | `onItemClick` 追加、選択イベント / 位置 state、オーバーレイ描画 |
| `src/tests/Timeline.spec.tsx` | `onItemClick` でモーダルが開く / 管理者読取専用のテスト追加 |

## 7. 既存 Calendar（個人）への影響

`AddChildForm` は `readOnly` 未指定で呼ばれるため、`readOnlyMode = undefined === true && ... = false` となり従来挙動を完全維持する。`CalendarView.tsx` は変更なし。
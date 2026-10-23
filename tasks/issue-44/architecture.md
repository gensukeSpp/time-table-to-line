# アーキテクチャ — 2 つの調整と、1 つの仕様変更

3 つの独立した修正。**バックエンド 1 点**（`progress` の null 解除）+ **フロント 3 点**（フォームリセット / 進捗 null 保存 / 閲覧ゲート撤去）。

## 1. 変更対象ファイル

### バックエンド（`light_token_server`）

| ファイル | 変更 | 担当 |
|---------|------|------|
| `app/routers/timetable.py:205-206` | `if body.progress is not None:` → `if "progress" in body.model_fields_set:`（明示的 null で解除可能に） | Task 1 |
| `tests/test_timetable.py` | `test_event_update_progress_null_clears` を追加 | Task 1 |

### フロントエンド（`time-table-to-line`）

| ファイル | 変更 | 担当 |
|---------|------|------|
| `src/components/organisms/InputItem.tsx:116-124` | 進捗 `NativeSelect` をオブジェクト `data` 化し、`''` 選択で **undefined**（未定）に | Task 2 |
| `src/components/molecules/EventUpdateButton.tsx:18-22` | 送信ペイロードで `progress: ... ?? null` へ変換（バックエンドで明示 null 解除） | Task 2 |
| `src/lib/TimelineType.ts:15-23` | `TimelineEventProps.progress` を `string \| null` 許容へ拡張 | Task 2 |
| `src/tests/InputItem.spec.tsx` | 進捗 null 保存のテスト追加（`useEventMutation` をモック） | Task 2 |
| `src/components/organisms/MilestoneCreateDialog.tsx` | `useEffect` で再オープン時に 3 フィールドをリセット | Task 3 |
| `src/components/organisms/MilestoneCreateDialog.test.tsx` | 再オープン時の空化テスト追加 | Task 3 |
| `src/components/pages/TimelinePage.tsx:59,126-134` | ゲート `if (!(isAdmin || authId === event.staff_id)) return;` を撤去し、未使用 `authId` を削除 | Task 4 |

## 2. バックエンド API 契約（変更: `POST /event/update/{id}`）

- **変更前**: `progress` は `None` だと更新をスキップ（null に戻せない）。
- **変更後**: `model_fields_set` で「送られたか」を判別し、**明示的 null で解除**する（`milestone_id` の既存パターン `timetable.py:210-211` と同じ）。

```python
# app/routers/timetable.py（変更前 → 後）
-    if body.progress is not None:
-        target.progress = body.progress
+    # Issue #44: progress も「送られたか(None でも)」で判別し、明示的 null で解除できるようにする
+    # （milestone_id と同じパターン）。summary は「送られたら上書き」のままで良い。
+    if "progress" in body.model_fields_set:
+        target.progress = body.progress
```

> `summary`（L203-204）は変更しない（`s2` などへの上書きのみ。空文字クリアが必要になったら別 Issue で）。YAGNI。

## 3. フロント 型 / 純粋関数

- **型拡張（本実装の変更点）**: `TimelineEventProps.progress` を `string | null | undefined` へ拡張（`src/lib/TimelineType.ts` の Merge override に `progress?: string | null` を追加）。`MilestoneEventProps`（`:80`, 元から `string | null`）とは別の型。バックエンド `EventUpdate.progress: str | None` と整合し、送信ペイロードで null を表せるようにする。
- **配色変更なし**: `progressToColor(null)` → `DEFAULT_EVENT_COLOR`（`#3174ad`）。`CalendarView.tsx` の `eventPropGetter` / `resolveEventColor` が既に対応（Issue #35）。

## 4. UI 実装

### 4-1. 進捗 null 保存（`src/components/organisms/InputItem.tsx:116-124`）

`data` をプレーン文字列配列 → オブジェクト配列にし、専用 `onChange` で `''` → **undefined（未定）** へ変換する。送信時（`EventUpdateButtons`）に `?? null` で明示的 null にしてバックエンドで解除する（D1）。

```tsx
<NativeSelect
  name="progress"
  value={eventItem.progress ?? ''}
  onChange={(e) => {
    const v = e.currentTarget.value;
    // Issue #44: ''（プレースホルダー）選択で未定（undefined）へ戻す。
    // 送信時（EventUpdateButtons）に ?? null で明示的 null に変換し、バックエンドで解除する。
    setEventItem({ ...eventItem, progress: v === '' ? undefined : v });
  }}
  data={[
    { value: '', label: '---進捗を選んでください---' },
    ...options.map((o) => ({ value: o.label, label: o.label })), // value も日本語ラベルに（canonical）
  ]}
/>
```

- `options`（`InputItem.tsx:26-31`）は `{ value: 英字トークン, label: 日本語 }` だが、**セレクトの `value` は日本語ラベル（`label`）を canonical** とする（`map` で `value: o.label` に変換）。これにより保存値・readOnly 表示が日本語になる。英字トークンは旧データ互換として配色 / グルーピングで正規化継続。
- 汎用 `handleChange`（L39-43）は `summary` 用として残す（進捗は専用 handler に移る）。
- `EventUpdateButtons`（`EventUpdateButton.tsx:18-22`）は **`progress: indicateEvent.progress ?? null`** を送る。`eventItem.progress` が `undefined`（未定）なら `progress: null` が明示送信され、バックエンドが解除する。これに伴い `TimelineEventProps.progress` を `string | null` 許容へ拡張（§3）。

### 4-2. マイルストーン作成フォームのリセット（`MilestoneCreateDialog.tsx`）

```tsx
import { useState, useEffect } from 'react';
// ...
export const MilestoneCreateDialog = ({ opened, onClose }: MilestoneCreateDialogProps) => {
  const addMilestone = useAddMilestoneMutation();
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [guidelineEndDate, setGuidelineEndDate] = useState<Date | null>(null);

  // Issue #44: 再オープン時に前回の内容が残らないよう、opened が true になったらリセットする。
  useEffect(() => {
    if (opened) {
      setTitle('');
      setDescription('');
      setGuidelineEndDate(null);
    }
  }, [opened]);
  // ...
```

- `MilestoneAddButton` 側は変更不要（`<MilestoneCreateDialog opened={opened} onClose={...} />`）。

### 4-3. イベント詳細閲覧の緩和（`src/components/pages/TimelinePage.tsx`）

```tsx
  // （L59）未使用になる authId 宣言を削除
-  const authId = authInfo.type === 'auth' ? authInfo.authId : undefined;

  // イベントクリックで詳細オーバーレイを開く（Issue #44: 同グループメンバーは全員閲覧可能。閲覧専用）
  const handleItemClick = (itemId: Id, e: React.SyntheticEvent, _time: number) => {
    const event = state.find((evt) => evt.id === itemId);
    if (!event) return;
    // 一般ユーザーには他メンバーの詳細を表示しない（{admin & ...}）  ← 撤去
    setSelectedEvent(event);
    setOverlayPos(computeOverlayPos(e, containerRef));
  };
```

- 詳細モーダルは常に `readOnly={true}`（L242）で表示され、`AddChildForm` が「更新 / 削除」を自分のイベントのみに制御（`InputItem.tsx:140-144`）するため、**閲覧のみ**が緩和され編集は従来どおり制限される。

## 5. 決定事項

| ID | 内容 |
|----|------|
| D1 | `progress` の解除はバックエンドの `model_fields_set` 判別とする。フロントは状態 = undefined、**送信時（`EventUpdateButtons`）に `?? null` で明示的 null を必ず送る**（undefined のまま JSON 化するとキーごと消え解除されない）。 |
| D2 | 進捗 `NativeSelect` はオブジェクト `data`（`{ value, label }`）へ変更し、プレースホルダーを `{ value: '' }` 化する。 |
| D3 | フォームリセットは `useEffect([opened])` の false→true 遷移で行う。 |
| D4 | 閲覧ゲート撤去後、未使用 `authId` を削除して lint を保つ（`isAdmin` は残す）。 |
| D5 | `progress` の配色パレット / 詳細モーダルの見た目は変更しない（既存実装で受け入れ要件を充足）。 |
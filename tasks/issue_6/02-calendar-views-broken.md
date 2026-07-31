# Issue 2: タイムテーブルのビュー切り替えができない

> **問題文:** "month", "day", "agenda" が表示できない
> **深刻度:** 大
> **関連:** `MyCalendar` コンポーネント `DnDCalendar.onView` が未実装

## 現状分析

### 事象
- カレンダーは週表示（`defaultView="week"`）のみ表示される
- 月表示・日表示・アジェンダ表示に切り替えられない

### 根本原因

`CalendarView.tsx` の `onView` コールバックが空実装である:

```tsx
// CalendarView.tsx:84-85
const onView = useCallback((_newView: View) => {
  // 何もしない
}, []);
```

`react-big-calendar` の `onView` は、ユーザーがビューボタン（month/day/week/agenda）をクリックしたときに呼ばれるコールバックである。しかし、このコールバックは単なる通知に過ぎず、**実際のビュー状態を保持する `view` props が設定されていない**ため、空実装でも「ビューを切り替える」動作には直接影響しない。

**真の原因:** `DnDCalendar` に `view` プロパティが渡されておらず、ビュー状態が React の state で管理されていない。`react-big-calendar` は内部でビュー状態を管理するが、`onView` コールバックを介して外部から制御する設計になっている。`view` prop が渡されていない場合、コンポーネントは内部 state を使うが、`onView` が空だと外部からビュー変更をトリガーできない。

### react-big-calendar のビューメカニズム

```
react-big-calendar のビュー制御:
  ┌──────────────────────────────────────────────────┐
  │  <Calendar                                       │
  │    view={currentView}    ← 制御用 prop（外部 state）│
  │    onView={setCurrentView}  ← 変更通知 → state更新│
  │    views={['month','week','day','agenda']}        │
  │  />                                               │
  └──────────────────────────────────────────────────┘
```

- `view` prop: 現在のビューを指定（`'month' | 'week' | 'day' | 'agenda'`）
- `onView` callback: ユーザーがビューボタンをクリックしたときに呼ばれる、新しいビュー名を受け取る
- `views` prop: 表示可能なビューのリスト（デフォルトは `['month', 'week', 'day', 'agenda']`）
- ツールバー（`Toolbar` コンポーネント）は `views` に含まれるビューのボタンを自動生成する

### 現在のコードの問題点

```tsx
// CalendarView.tsx:129-151
<DnDCalendar
  date={displayDate}          // ← 日付ナビゲーションは state 管理されている
  defaultView="week"          // ← 初期ビューのみ指定
  // view={currentView}       // ← 未設定！
  onNavigate={onNavigate}     // ← 日付変更は実装されている
  onView={onView}             // ← 空実装！
  // ...
/>
```

## 修正計画

### 修正 1: View 状態の state 追加と onView 実装

**ファイル:** `src/components/pages/CalendarView.tsx`

**変更内容:**
- `View` 型の state を追加
- `onView` コールバックで state を更新
- `DnDCalendar` に `view` prop を追加

**実装:**
```tsx
// 追加: View state
const [currentView, setCurrentView] = useState<View>('week');

// 修正: onView コールバック
const onView = useCallback((newView: View) => {
  setCurrentView(newView);
}, []);

// 修正: DnDCalendar に view prop を追加
<DnDCalendar
  view={currentView}       // ← 追加
  onView={onView}          // ← 実装済み
  // ... 既存の props
/>
```

### 修正 2（任意）: `views` prop の明示的指定

デフォルトでは `react-big-calendar` は `['month', 'week', 'day', 'agenda']` の全ビューを表示する。問題なければ明示的に指定する必要はないが、特定のビューのみ表示したい場合に備えて:

```tsx
<DnDCalendar
  views={['month', 'week', 'day', 'agenda']}
  // ...
/>
```

### 修正 3（任意）: 日本語化したツールバーのカスタマイズ

現在のツールバーは英語表示（"month", "week", "day", "agenda"）。`components` prop でカスタムツールバーを提供することで日本語化可能。ただし本 Issue のスコープ外のため、必要に応じて別タスクとする。

## 影響範囲

| ファイル | 変更内容 | リスク |
|---------|---------|-------|
| `src/components/pages/CalendarView.tsx` | view state 追加 + onView 実装 | 低（state 追加のみ。ツールバーが自動で動作する） |

## 動作確認手順

1. カレンダーのツールバーにある "month" ボタンをクリック → 月表示に切り替わる
2. "day" ボタンをクリック → 日表示に切り替わる
3. "agenda" ボタンをクリック → アジェンダ表示に切り替わる
4. "week" ボタンをクリック → 週表示に戻る
5. 各ビューでイベントが正しく表示されることを確認
6. 各ビューでイベントの追加・編集・削除が動作することを確認
7. ビュー切り替え後も日付ナビゲーションが正しく動作することを確認

## タスク一覧

- [ ] `CalendarView.tsx` に `currentView` state を追加（`useState<View>('week')`）
- [ ] `onView` コールバックを `setCurrentView` に変更
- [ ] `DnDCalendar` に `view={currentView}` prop を追加
- [ ] `bun run lint` で警告ゼロ確認
- [ ] `bun run build` でビルド成功確認
- [ ] ブラウザで全ビュー（month/week/day/agenda）が切り替え可能なことを確認
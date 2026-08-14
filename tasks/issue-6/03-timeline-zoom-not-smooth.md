# Issue 3: タイムラインのズーム機能がスムーズでない

> **問題文:** タイムラインの「ズーム」機能がスムーズでなくなった
> **深刻度:** 大
> **関連:** イベントをドラッグすると、タイムライン自体がズームイン・ズームアウトされる

## 現状分析

### 事象
- イベントをドラッグしようとすると、タイムライン自体がズームイン・ズームアウトしてしまう
- ズーム操作がカクカクしていてスムーズでない
- タイムライン上のイベントのドラッグとズーム操作が競合している

### 根本原因

#### 原因 1: ズーム用ドラッグとイベントドラッグの競合

`useTimelineDragZoom.ts` の `handleMouseDown`（21行目）は、**イベントアイテム上でのクリックを検知してズームドラッグを開始する**:

```tsx
// useTimelineDragZoom.ts:21-27
const handleMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
  const itemElement = (e.target as HTMLElement).closest('.rct-items');
  if (!itemElement) {
    return;  // アイテム以外ではズーム開始しない
  }
  e.preventDefault();
  setIsDragging(true);
  setDragStartX(e.clientX);
}, []);
```

このロジックは「イベントアイテムをクリックしたときだけズームを開始する」という意図だが、`react-calendar-timeline` のイベントドラッグ機能と競合する。ユーザーがイベントをドラッグしようとすると、`onMouseDownCapture` で `handleMouseDown` が発火し、`e.preventDefault()` によってイベントのドラッグがブロックされ、代わりにズームが開始されてしまう。

#### 原因 2: ドラッグ開始位置の更新がコメントアウトされている

`useTimelineDragZoom.ts` の `handleMouseMove`（53行目）で、`setDragStartX(e.clientX)` がコメントアウトされている:

```tsx
// useTimelineDragZoom.ts:52-53
// 継続的なズームのためにドラッグ開始点を更新
// setDragStartX(e.clientX);
```

これにより、`handleMouseMove` が呼ばれるたびに `dragDistance = e.clientX - dragStartX` が**初期ドラッグ位置からの累積距離**で計算される。本来は毎回の `mousemove` イベントで `dragStartX` を現在位置に更新し、**微小な移動量の差分**でズームを計算する必要がある。累積距離を使うと、マウスを少し動かしただけで大きなズームが発生し、スムーズでない。

#### 原因 3: `handleMouseMove` の依存配列に `visibleTime` が含まれている

```tsx
// useTimelineDragZoom.ts:56-57
[isDragging, dragStartX, visibleTime, timelineWidth]
```

`handleMouseMove` 内で `setVisibleTime(newTimes)` を呼ぶと `visibleTime` が更新され、その結果 `handleMouseMove` の参照が再生成される。これにより、React のイベントハンドリングで古いクロージャの問題が発生する可能性がある。`useRef` を使用して現在の表示時間を保持する方が安全。

### データフロー

```
TimelinePage.tsx
  └── MyHorizonTimeline
        ├── containerRef → timelineWidth を取得
        ├── useTimelineDragZoom(defaultTimeStart, defaultTimeEnd, timelineWidth)
        │     ├── handleMouseDown  (canvas 上の mousedown をキャプチャ)
        │     ├── handleMouseMove  (ドラッグ中の mousemove → ズーム計算)
        │     ├── handleMouseUp    (ドラッグ終了)
        │     ├── handleMouseLeave (ドラッグ中断)
        │     ├── visibleTimeStart / visibleTimeEnd
        │     └── updateVisibleTime (onTimeChange と同期)
        └── <Timeline
              visibleTimeStart={visibleTimeStart}
              visibleTimeEnd={visibleTimeEnd}
              onTimeChange={handleTimeChange}
              canMove={false}    ← イベント移動は無効化済み
              canResize={false}  ← イベントリサイズは無効化済み
            />
```

### 関連ファイル

| ファイル | 役割 |
|---------|------|
| `src/hooks/useTimelineDragZoom.ts` | ズーム用ドラッグハンドラ（**問題の中心**） |
| `src/lib/timelineZoomUtils.ts` | ズーム計算ユーティリティ（`calculateZoomedTimeRange`, `calculateTimeRange`） |
| `src/components/pages/TimelinePage.tsx` | タイムラインコンポーネント（`useTimelineDragZoom` を呼び出し） |

## 修正計画

### 修正 1: ズーム用ドラッグとイベントドラッグの分離

**ファイル:** `src/hooks/useTimelineDragZoom.ts`

**変更内容:**
- `handleMouseDown` の `'.rct-items'` 判定を削除し、代わりに**キャンバスの背景（アイテム以外）をクリックしたときのみズームドラッグを開始**する
- または、ズーム操作を Ctrl/Shift キー押下時のみ有効にする

**Option A: 背景クリックのみズーム（推奨）**
```tsx
const handleMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
  // アイテム上でのクリックはズーム開始しない（イベント操作用にバイパス）
  const itemElement = (e.target as HTMLElement).closest('.rct-item');
  if (itemElement) {
    return;  // アイテム上ではズームしない
  }
  e.preventDefault();
  setIsDragging(true);
  setDragStartX(e.clientX);
}, []);
```

**Option B: Ctrl/Shift キー + ドラッグでズーム**
```tsx
const handleMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
  // Ctrl または Shift キーが押されているときのみズーム
  if (!e.ctrlKey && !e.shiftKey) {
    return;
  }
  e.preventDefault();
  setIsDragging(true);
  setDragStartX(e.clientX);
}, []);
```

### 修正 2: ドラッグ開始位置の更新を有効化

**ファイル:** `src/hooks/useTimelineDragZoom.ts`

**変更内容:**
- `handleMouseMove` 内の `setDragStartX(e.clientX)` のコメントアウトを解除
- これにより、毎回の `mousemove` で微小な差分だけがズーム計算に使われるようになる

```tsx
const handleMouseMove = useCallback(
  (e: React.MouseEvent<HTMLElement>) => {
    if (!isDragging || dragStartX === null) return;

    const dragDistance = e.clientX - dragStartX;

    // 小さな動きでは更新しない
    if (Math.abs(dragDistance) < DRAG_SENSITIVITY) return;

    const newTimes = calculateZoomedTimeRange(
      { start: visibleTime.start, end: visibleTime.end },
      dragDistance,
      timelineWidth,
      -DRAG_SENSITIVITY
    );

    setVisibleTime(newTimes);
    // 継続的なズームのためにドラッグ開始点を更新 ← 有効化
    setDragStartX(e.clientX);
  },
  [isDragging, dragStartX, visibleTime, timelineWidth]
);
```

### 修正 3: `visibleTime` の依存関係を `useRef` に変更（安定性向上）

**ファイル:** `src/hooks/useTimelineDragZoom.ts`

**変更内容:**
- `visibleTime` を `useRef` でも保持し、`handleMouseMove` の依存配列から削除
- これにより、`handleMouseMove` の参照が不必要に再生成されるのを防ぐ

```tsx
const visibleTimeRef = useRef(visibleTime);
visibleTimeRef.current = visibleTime;

const handleMouseMove = useCallback(
  (e: React.MouseEvent<HTMLElement>) => {
    if (!isDragging || dragStartX === null) return;
    // ... 計算ロジック ...
    // visibleTime の代わりに visibleTimeRef.current を使用
    const newTimes = calculateZoomedTimeRange(
      { start: visibleTimeRef.current.start, end: visibleTimeRef.current.end },
      // ...
    );
    setVisibleTime(newTimes);
    setDragStartX(e.clientX);
  },
  [isDragging, dragStartX, timelineWidth]  // visibleTime を削除
);
```

### 修正 4（任意）: ズームの感度調整

`DRAG_SENSITIVITY` 定数を調整してズームの速度を変更する。現在の値:
```tsx
const DRAG_SENSITIVITY = 2;
```
値を大きくするとズームが遅くなり（細かい操作が可能）、小さくすると速くなる。

### 修正 5（任意）: `timelineWidth` の動的更新

`TimelinePage.tsx` の `useEffect` で `timelineWidth` を初期化時のみ取得している（27-31行目）。ウィンドウリサイズ時に再計算するよう改善可能:

```tsx
useEffect(() => {
  const handleResize = () => {
    if (containerRef.current) {
      setTimelineWidth(containerRef.current.offsetWidth);
    }
  };
  handleResize();
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

## 影響範囲

| ファイル | 変更内容 | リスク |
|---------|---------|-------|
| `src/hooks/useTimelineDragZoom.ts` | アイテム判定ロジック変更 + setDragStartX 有効化 + ref 追加 | 中（ズーム動作全体に影響。テスト必須） |
| `src/components/pages/TimelinePage.tsx` | 任意: timelineWidth 動的更新 | 低 |

## 動作確認手順

1. タイムラインの背景（アイテムがない領域）でドラッグ → ズームが動作する
2. タイムライン上のイベントをクリック/ドラッグ → イベントの選択ができる（ズームが発動しない）
3. ズームイン/アウトがスムーズに動作する（カクカクしない）
4. タイムラインのスクロール（左右）とズームが両立する
5. `bun run lint` で警告ゼロ確認
6. `bun run build` でビルド成功確認

## タスク一覧

- [ ] `useTimelineDragZoom.ts` の `handleMouseDown` でアイテム上でのクリックを除外（`.rct-item` 判定で return）
- [ ] `handleMouseMove` の `setDragStartX(e.clientX)` コメントアウトを解除
- [ ] （推奨）`useRef` を使用して `handleMouseMove` の依存配列から `visibleTime` を削除
- [ ] `bun run lint` で警告ゼロ確認
- [ ] `bun run build` でビルド成功確認
- [ ] ブラウザでイベントドラッグとズームが競合しないことを確認
- [ ] ズーム操作がスムーズになったことを確認
- [ ] （任意）ウィンドウリサイズ時の `timelineWidth` 動的更新を実装
# Task-12 architecture — 修正の実装詳細

## 変更対象ファイル

| ファイル | 変更内容 |
|---|---|
| `src/components/pages/TimelinePage.tsx` | `itemRenderer` を修正（マイルストーン色を ref 経由で imperative に適用） |
| `src/lib/milestoneLookup.ts` | **変更なし**（`computeItemDecorations` をそのまま共用） |

## 現行コード → 修正後

### 修正前（抜粋, PR #24 由来）

```tsx
const decor = computeItemDecorations(colorByMilestoneId, statusByMilestoneId, item.milestone_id);
const { key, ref, ...rest } = getItemProps({ style: decor });
return (
  <div {...rest} ref={ref} key={`${key}-outer`}>
    {useResizeHandle ? <div {...left} /> : null}
    <div className="rct-item-content" style={{ maxHeight: `${dimensions.height}px` }}>{title}</div>
    {useResizeHandle ? <div {...right} /> : null}
  </div>
);
```

`getItemProps({ style: decor })` — decor の `backgroundColor` を React の `style` prop 経由で渡す方式。ライブラリの imperative 書き込みに上書きされて消える（根本原因）。

### 修正後

```tsx
itemContext: Pick<ItemContext, 'useResizeHandle' | 'title' | 'dimensions' | 'selected'>;
...
const { useResizeHandle, title, dimensions, selected } = itemContext;
const { left, right } = getResizeProps();
const decor = computeItemDecorations(colorByMilestoneId, statusByMilestoneId, item.milestone_id);

// getItemProps には decor を渡さない（ライブラリ既定背景を素直に使う）。
// マイルストーン色は !important 付き imperative 適用で、ライブラリの書き込みに勝たせる。
const { key, ref, ...rest } = getItemProps({ style: {} });
const applyMilestoneStyle = (node: HTMLDivElement | null) => {
  if (!node || !decor.backgroundColor) return; // 未所属イベントはライブラリ既定色のまま
  if (!selected) {
    node.style.setProperty('background-color', decor.backgroundColor, 'important');
    if (decor.opacity != null) node.style.opacity = String(decor.opacity);
  } else {
    node.style.removeProperty('background-color'); // 選択中はライブラリの #ffc107 を見せる
  }
};
const itemRef = (node: HTMLDivElement | null) => {
  // ライブラリの ref（オブジェクト or 関数）を維持しつつ、自前の背景適用を合成する
  if (typeof ref === 'function') ref(node);
  else if (ref && typeof ref === 'object' && ref.current !== undefined) (ref as { current: unknown }).current = node;
  applyMilestoneStyle(node);
};
return (
  <div {...rest} ref={itemRef} key={`${key}-outer`}>
    {useResizeHandle ? <div {...left} /> : null}
    <div className="rct-item-content" style={{ maxHeight: `${dimensions.height}px` }}>{title}</div>
    {useResizeHandle ? <div {...right} /> : null}
  </div>
);
```

## 設計ノート

### なぜ `!important` + imperative か

調査で得た事実（実ブラウザ計測）:
- 修正前、選択解除後の該当要素の `style` 属性は `background: rgb(33,150,243)`（デフォルト）+ `opacity: 0.7` と書かれ、`backgroundColor` がライブラリに上書きされていた。
- 一方 `itemRenderer` が読む `getItemProps` 内部の `rest.style.backgroundColor` は `#9c27b0` を持っていた。→ 「React style prop の値」と「実際の DOM style」が乖離している = ライブラリの imperative 書き込みの痕跡。

`!important`（`setProperty(prop, value, 'important')`）は、ライブラリが `element.style.background = '...'` と通常優先度で書いても上書きされない。これで決定性が得られる。

### `selected` の取得元

- `itemContext.selected: boolean` は `react-calendar-timeline` の `ItemContext` インターフェースに存在（`node_modules/react-calendar-timeline/dist/lib/types/main.d.ts:77`）。`itemRenderer` の `itemContext` から取り出せる。
- 型は既存の inline 型アノテーション（`Pick<ItemContext, ...>`）に `'selected'` を追加。

### `getItemProps({ style: {} })` の意味

- decor を渡さないので、ライブラリの基準色 `Qh`（`#2196f3`）と選択色 `ed`（`#ffc107`）が素直に当たる。
- マイルストーン色は ref コールバックで別途適用。これで「React style prop 依存」を排除し、ライブラリの imperative 上書きの影響を受けない。

### 未所属イベントのガード

- `applyMilestoneStyle` 冒頭で `!decor.backgroundColor` なら早期 return。**未所属イベントに `removeProperty('background-color')` を実行しない**（初期版でここを全アイテムにやった結果、未所属イベントが 透明 `rgba(0,0,0,0)` になる回帰が起きた → ガード必須）。

## API・型・依存の変更

- **API 契約（バックエンド）変更なし**。
- **型変更**: `TimelinePage.tsx` 内の `itemRenderer` 引数アノテーションに `'selected'` を追加のみ。外部型（`TimelineType.ts` など）は不変。
- **依存追加なし**。

## 影響範囲（blast radius）

- 変更は `TimelinePage.tsx` の `itemRenderer` 内部のみ。
- `src/lib/milestoneLookup.ts` / `TimelineType.ts` は不変のため、Calendar 側・MilestoneList / テストへの影響なし。
- Storybook / 単体テストは `milestoneLookup.spec.ts`（純関数）を参照。`itemRenderer` 自体はライブラリ描画のため単体では検証せず、実ブラウザ + 関連テストで確認。
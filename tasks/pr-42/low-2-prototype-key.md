# 低-2: 未知の progress 値で Object.prototype のキーが誤判定される問題

## 概要
`src/lib/milestoneEvents.ts` の `normalizeProgressGroup` で `TOKEN_TO_GROUP[progress] ?? '指定なし'` を使用しているため、`progress` が `constructor` / `toString` などの Object.prototype のキーの場合、プロトタイプのメソッド（関数）が返り、イベントが黙って消える。

## 修正方向
- `Object.hasOwn(TOKEN_TO_GROUP, progress) ? TOKEN_TO_GROUP[progress] : '指定なし'` に変更
- `src/lib/progressColor.ts` の `PROGRESS_TOKEN_TO_LABEL[progress]` / `PROGRESS_COLORS[key]` も同様のパターンなので修正を検討
- テストに 'constructor' ケースを追加（`src/tests/milestoneEvents.spec.ts`）

## 対象ファイル
- `src/lib/milestoneEvents.ts`
- `src/lib/progressColor.ts`
- `src/tests/milestoneEvents.spec.ts`

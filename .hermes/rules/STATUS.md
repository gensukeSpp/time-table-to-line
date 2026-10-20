# Status — 現在の状況と今後のタスク

このファイルは「現在の状況」と「これからやること」をまとめる。
完了したタスクおよび解消済みバグの履歴は [`TASKS.md`](./TASKS.md) を参照。

---

## リファクタリング前の前提作業（完了済み）

- [x] パッケージ管理: yarn → **bun** 移行
- [x] 全ライブラリを現時点の最新版に更新
- [x] 未使用ファイル削除: `src/DnDApp.tsx`, `src/lib/ClickOrDouble.js`
- [x] `vite.config.ts` 整理

---

## 今後必要なコード修正タスク（順次実施）

1. ESLint フラット設定: `.eslintrc.cjs` → `eslint.config.js` 移行
2. TypeScript 型エラー修正（`Theme.ts` 削除, `console.log` 一掃）
3. React 19 互換性修正: useRef の引数なし呼び出し等
4. `react-calendar-timeline` import 修正: `react-calendar-timeline-v3` → `react-calendar-timeline`
5. UI ライブラリ統一: Chakra UI / Radix UI → **Mantine v7** に置き換え
6. 日付ライブラリ統一: moment / dayjs → **date-fns** に書き換え
7. コンポーネントリファクタリング（molecules / organisms / pages / templates 再配置）
   - **Phase A** — コードベースクレンジング（未使用ファイル・型・コメントアウト一掃）
   - **Phase B** — ESLint 安全性回復（no-console / no-unused-vars / exhaustive-deps 段階的有効化）
   - **Phase C** — クエリ層重複排除（useEventsQuery 統合）
   - **Phase D** — 型安全性向上（ESLint error 化 / fetch ヘッダー共通化）
   - **Phase E** — バグ調査（11PM / 重なり / タイムゾーン）
   - **Phase F** — 品質ゲート（lint / build / test 最終確認）
   - 詳細は [`tasks/task-07/README.md`](../../tasks/task-07/README.md) を参照

---

## 未対応のバグ（保留中）

- **タイムテーブル**: DB 保存時刻が日本時間ではない（UTC の可能性）— **E-3** 調査済み・通常は正しく動作するため保留

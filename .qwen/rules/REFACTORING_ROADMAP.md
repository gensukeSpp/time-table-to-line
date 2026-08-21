# リファクタリングロードマップ

リファクタリングは **コンポーネント単位で細かくタスク分割し、順序立てて進める**。

## 完了（2026-07-24）

1. **パッケージ管理**: yarn → bun 移行（完了）
2. **ライブラリ更新**: 全依存を最新に一括インストール（React 19, Vite 6, Mantine v7, TanStack Query 5, 等）
3. **不要コード削除**: `src/DnDApp.tsx`, `src/lib/ClickOrDouble.js` 削除、vite.config.ts 整理

## 完了（2026-08-10 時点）

4. **バグ修正**: 11PM 問題（task-08 / E-1）、タイムライン重なり表示（task-09 / E-2）
5. **認証 401 調査**: task-10（原因はフロントのトークン未送信。backend 修正不要）
6. **RBAC 土台**: `TimelineEventProps` に `admin: boolean` 追加（PR #9 / commit `71a9ae1`）

## 今後必要なコード修正タスク（順次実施）

1. **ESLint フラット設定**: `.eslintrc.cjs` → `eslint.config.js` 移行（ESLint 9 対応）
2. **Mantine 移行**: Chakra UI / Radix UI → Mantine v7 コンポーネント置き換え（import 修正含む）
3. **date-fns 統一**: moment / dayjs → date-fns に書き換え（サブパス import の修正含む）
4. **react-calendar-timeline import 修正**: `react-calendar-timeline-v3` → `react-calendar-timeline`
5. **React 19 互換性修正**: `useRef` の引数なし呼び出し修正、他 API 変更対応
6. **TypeScript 型エラー修正**: 上記修正に伴う型エラーの解消
7. **コンポーネントリファクタリング**: `molecules/` → `templates/` の順序等、提案ベースで決定
8. **バグ修正**: 11PM 問題、タイムライン重なり表示
9. **機能追加**: requirement-02.md で別途定義

## 備考

- インストール段階で削除した旧依存パッケージの一覧はプロジェクトメモリー参照
- 各コード修正タスクは `tasks/` ディレクトリ配下に計画を保存する
# Task-11(フロント) Test Plan — 自動 closed の画面反映(refetchInterval)

> テスト基盤: Vitest + Testing Library(`src/resources/queries.spec.tsx`)。
> 実装方針: `useMilestonesQuery` に `refetchInterval` を追加し、定期再取得させる。
> 間隔は `.env`(`VITE_MILESTONE_REFRESH_INTERVAL_MS`)で管理し、未設定時は 60 分。
> サーバー側の自動 closed との結合はバックエンド task-11 のテストに委ねる。

## 検証の対象

- `useMilestonesQuery` が `MILESTONE_REFRESH_INTERVAL_MS` 間隔で `/milestone/all` を再取得する。
- 取得したマイルストーン一覧がコンポーネント(`MilestoneList`)に正しく渡り、
  closed 化された項目が `status !== 'closed'` フィルタで一覧から外れる(既存ロジックの回帰確認)。

## 追加テスト一覧

| # | テスト名 | シナリオ | 期待 |
|---|---|---|---|
| 1 | `refetchInterval is set` | `useMilestonesQuery` を renderHook | 戻り値のクエリオプション(`refetchInterval`)が `MILESTONE_REFRESH_INTERVAL_MS` 一致 |
| 2 | `refetchInterval triggers refetch` | `vi.useFakeTimers()` + `fetchMilestones` をモック、間隔を短くして renderHook | 一定時間経過後、`fetchMilestones` が複数回呼ばれる |
| 3 | `no refetch when staleTime Infinity` | 既存テスト/Storybook と同じ `staleTime: Infinity` で renderHook | `refetchInterval` があっても再フェッチされない(TanStack の挙動確認) |
| 4 | `invalidateMilestoneList still works` | 更新操作後に `invalidateMilestoneList` 呼び出し | 従来通り即時再フェッチされる(手動更新の即時反映が壊れていない) |

## 回帰対象(壊さない確認)

- `useEventsQuery` / `useAuthQuery` が無変更であること(他クエリに refetchInterval を
  付与しない)。
- `src/components/index.tsx` の QueryClient 全体設定(`refetchOnWindowFocus: false`)を
  変更しないこと。
- `MilestoneList` の `status !== 'closed'` フィルタ・`computeItemDecorations` の配色
  ロジックが無変更であること。

## 検証コマンド

```bash
cd time-table-to-line
bun test src/resources/queries.spec.tsx      # 当該テスト
bun run testrun                              # CI モード(全件)
bun run lint
bun run build
```

## 手動 QA(利用者実施)

1. バックエンドを `MILESTONE_CLOSE_GRACE_DAYS=0` + `MILESTONE_CLOSE_INTERVAL_MINUTES=1` で起動。
2. フロントを起動し、Timeline 画面で waiting のマイルストーンを作成。
3. 画面を開いたまま 1 分待つ → 自動 closed 後、`refetchInterval` の再取得で
   **一覧から消え、イベントの色がデフォルト(#2196f3)に戻る**ことを確認。
4. フロントの再マウント(リロード)なしで反映されることを確認(ポーリングの効果)。
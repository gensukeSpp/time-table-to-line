# Task-11(フロント) Architecture — 自動 closed の画面反映(refetchInterval)

## 1. 目的と背景

バックエンド task-11 が導入する「猶予期間経過後の自動 `waiting -> closed`」は
サーバー側のバックグラウンドジョブ(APScheduler)で行われるため、
**フロントエンドのキャッシュ無効化(`invalidateMilestoneList`)が発火しない**。
TanStack Query の設定を確認すると、マイルストーン一覧はマウント時/明示 invalidate 時に
しか再フェッチされない。その結果、画面を開いたまま放置すると closed 化が反映されない。

本タスクは、`useMilestonesQuery` に `refetchInterval`(定期再取得)を追加し、
サーバー側の自動 closed をタイムリーに画面へ反映させることを目的とする。

## 2. 現状の再取得フロー(変更前)

```
[サーバー] APScheduler が waiting 超過を closed 化
     ↓ (フロントからの invalidate は飛ばない)
[フロント] useMilestonesQuery のキャッシュは古いまま
     ↓
MilestoneList は waiting のまま表示し続ける
```

- `useMilestonesQuery`(src/resources/queries.ts:118-123): queryKey + queryFn のみ
- QueryClient 全体(src/components/index.tsx:5-11): `refetchOnWindowFocus: false`
- = 自動再取得の仕組みが無い

## 3. 変更後フロー

```
[フロント] useMilestonesQuery に refetchInterval(例: サーバー間隔と同じ 60 分)
     ↓ 一定間隔で GET /milestone/all を再取得
     ↓ closed 化されたマイルストーンが一覧から消え、色がデフォルトへ戻る
```

`refetchInterval` は TanStack Query の標準オプションで、クエリ個別に指定できる。
`staleTime` に関わらず定期再実行される(キャッシュが有効でもポーリングする)点に注意。

## 4. 設計決定

| 論点 | 決定(確定済み 2026-09-07) | 備考 |
|---|---|---|
| 再取得間隔 | `.env` の `VITE_MILESTONE_REFRESH_INTERVAL_MS`、未設定時は **60 分**(3,600,000ms) | サーバー猶予チェック間隔(既定 60 分)に揃える |
| 間隔の管理 | `.env`(VITE_*)で管理し、`import.meta.env` から読む | ビルド時に解決される VITE_* の性質に注意 |
| 猶予日数 | `.env` の `VITE_MILESTONE_CLOSE_GRACE_DAYS`、未設定時は **5 日**(2026-09-08 正式採用) | バックエンド `MILESTONE_CLOSE_GRACE_DAYS` と揃える(値が散らないよう両リポジトリ同期) |
| 自動 closed 後の UX | 何もしない(一覧から消えるだけ) | 追加 UI/通知なし。display ロジックは既存で対応済み |

### 60 分の根拠(確定仕様)

フロントの再取得は「サーバーが closed 化した**後**の状態」を拾うのが目的。
サーバーは `MILESTONE_CLOSE_INTERVAL_MINUTES`(既定 60 分)ごとに waiting 超過を検知して
closed 化する。フロントが 60 分より短い間隔でフェッチしても、サーバーがまだ閉じていなければ
**無駄なリクエスト**になる。60 分に揃えれば「最大 1 間隔分(60 分)の遅延で必ず closed 状態を
取得」できる。= **サーバーの Producer 間隔以上に短くしても効果が無く、揃えるのが最小
リクエストで最大反映精度を得られる**ため。

### 再取得間隔とサーバー間隔の関係(Produce/Consume)

- サーバー: `MILESTONE_CLOSE_INTERVAL_MINUTES` ごとに waiting 超過を検知して closed 化
- クライアント: 同じ間隔で再フェッチ → 必ず「閉じた直後の状態」を拾える(最大で間隔ぶん遅延)
- 間隔をフロント側がサーバーより短くしても、サーバーが閉じる前のフェッチは無駄。**揃えるか
  サーバー間隔 + 数分のバッファ**が妥当(判断ポイント 1 で最終確定)。

## 5. ファイル構成と責務(実装後)

| ファイル | 責務 | 変更種別 |
|---|---|---|
| `src/resources/queries.ts` | `useMilestonesQuery` に `refetchInterval` 追加 | 変更 |
| `.env` / `.env.example` | `VITE_MILESTONE_REFRESH_INTERVAL_MS`(未設定時 60 分) | 変更 |
| `src/resources/queries.spec.tsx` | `useMilestonesQuery` のオプション検証テスト追加 | 変更 |

## 6. テスト戦略

- `useMilestonesQuery` の `refetchInterval` が設定されていることを検証(Testing Library /
  `queries.spec.tsx`)。実際のポーリングは `vi.useFakeTimers` で再フェッチ回数を確かめる。
- 既存クエリ(`useEventsQuery` / `useAuthQuery`)に影響が出ないこと(回帰)を確認。
- サーバー実行の自動 closed との統合は既存 API テスト(バックエンド task-11)に委ね、
  フロントは「fetchMilestones が定期で呼ばれる」ことの検証に留める。

## 7. 既存との整合性(非対象・影響)

| 既存機能 | 影響 |
|---|---|
| `useMilestonesQuery` の queryKey/queryFn | 変更なし。refetchInterval を追加するだけ |
| MilestoneList / computeItemDecorations | 変更不要(表示ロジックは既存仕様) |
| 更新/追加/削除時の `invalidateMilestoneList` | 変更なし(手動操作時の即時反映は従来通り) |
| 他クエリ(events/auth) | 無関係。全体設定は触らない |

## 8. リスクと対策

- **過剰ポーリング/サーバー負荷**: 間隔をサーバーと同じく(既定)にし、短くしすぎない。
  万一短くする場合は判断ポイント 1 で明示。
- **`refetchInterval` と `staleTime` の相互作用**: TanStack Query は refetchInterval を
  staleTime とは独立に扱うため、意図通り定期実行される。`staleTime: Infinity` 系のモック
  (既存テスト)では再フェッチが抑止されるので、テストでは明示的に設定を上書きして検証する。
- **間隔のバックエンドとの非同期ズレ**: サーバー間隔変更時にフロントも追随する必要が
  あるため、両者を揃えやすいよう定数化し、ドキュメント(本 overview)に間隔を明記する。
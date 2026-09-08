# Task-11(フロント) 実装計画 — 自動 closed の画面反映(refetchInterval)

> **For Hermes:** 実装は TDD(失敗→実装→成功→Commit)で進める。実装前に本ファイル群と
> `src/resources/queries.ts` / `src/resources/cache.ts` / `src/components/index.tsx` の既存
> キャッシュ設定、およびバックエンド `light_token_server/tasks/task-11/`(自動 closed)の
> 猶予チェック間隔設定を読み、既存の再取得挙動を壊さないこと。

**Goal:** バックエンドの自動 closed(猶予期間経過で `waiting -> closed`)が進行した際、
フロントエンドのマイルストーン一覧が**タイムリーに最新状態へ切り替わる**ようにする。
具体的には `useMilestonesQuery` に定期再取得(`refetchInterval`)を追加する。

> これは **backend task-11(グレース期間後の自動 closed)** の実装に**並行して対応する
> frontend 側の補助タスク**。バックエンド側のジョブだけで実装が完結せず、
> 画面を開いたまま放置した場合に waiting のまま残り続ける問題(下記「背景」)を解消する。

> ⚠ 本タスクは **プラン作成のみ**。実装は行わない(利用者指摘 2026-09-07)。

---

## 背景(なぜフロント対応が必要か)

自動 closed は **サーバー側のバックグラウンドジョブ**(APScheduler)で発生するため、
フロントエンドの TanStack Query のキャッシュを無効化するミューテーション
(`useMilestoneMutation` の `invalidateMilestoneList`)が **一切走らない**。
つまりキャッシュは自動で古くならない。

現状の設定を確認した結果:

| 設定 | 値 | 場所 |
|---|---|---|
| `refetchOnWindowFocus` | `false` | `src/components/index.tsx` 全体の QueryClient |
| `useMilestonesQuery` | individual の `staleTime` なし / `refetchInterval` なし | `src/resources/queries.ts:118-123` |

→ TanStack Query の既定では、マイルストーン一覧は**マウント時/明示的な
invalidate 時のみ**再フェッチされる。自動 closed は invalidate を飛ばさないため、
ユーザーが Timeline を開いたまま放置すると、**サーバー側では closed でも
画面上は waiting のまま残り続ける**。

表示ロジック自体(閉じたら非表示/デフォルト色へ)は既存仕様で対応済み
(`MilestoneList.status !== 'closed'` / `computeItemDecorations`)なので、必要なのは
**最新状態を引き込む再取得の仕組みだけ**。

## 解決方針

`useMilestonesQuery` に `refetchInterval`(定期ポーリング)を追加し、
マイルストーン一覧を一定間隔で再取得する。間隔はバックエンドの猶予チェック間隔
(`MILESTONE_CLOSE_INTERVAL_MINUTES`, デフォルト 60 分)に合わせることを既定とする。

## 成果物

- `useMilestonesQuery` に `refetchInterval` を追加(env/定数で間隔を制御)
- 再取得間隔の定数化(コード内に直書きせず、調整可能に)
- テスト: `useMilestonesQuery` のオプション検証 + 既存クエリに影響がないこと
- ドキュメント: 画面反映の仕組みを overview/architecture に明記

## スコープ外(今回はやらない)

- マイルストーンの**表示・配色ロジックの追加** — 既存仕様で対応済み。変更不要
- バックエンド側の実装(ジョブ・スケジューラ・猶予設定) — `light_token_server/tasks/task-11`
- `refetchOnWindowFocus` など全体の再取得挙動の変更 — 影響範囲が大きいため行わない
- Calendar 側 / イベントフォームへの反映

## 判断ポイント(実装前に利用者へ確認)

> **回答済み(利用者確認 2026-09-07): 実装時に再確認不要。以下が確定仕様。**

1. **再取得間隔の値** ⭐
   確定: **既定 60 分**。
   根拠: フロントの再取得は「サーバーが closed 化した**後**の状態」を拾うのが目的。
   サーバーは `MILESTONE_CLOSE_INTERVAL_MINUTES`(既定 60 分)ごとに waiting 超過を検知して
   closed 化するため、フロントが 60 分より短い間隔でフェッチしても、サーバーがまだ
   閉じていなければ**無駄なリクエスト**になる。逆に 60 分に揃えれば「最大 1 間隔分(60 分)の
   遅延で必ず closed 状態を取得」できる。= **サーバーの Producer 間隔以上に短くしても
   効果が無く、揃えるのが最小リクエストで最大反映精度を得られる**ため。
2. **間隔の一元管理**
   確定: **`.env`(VITE_*)で持つ**。`VITE_MILESTONE_REFRESH_INTERVAL_MS` として管理し、
   コードは import.meta.env から読む。未設定時の既定は 60 分(3,600,000ms)。
3. **自動 closed 直後の UX**
   確定: **何もしない(一覧から消えるだけ)**。追加 UI / 通知はなし。
   display ロジックは既存仕様(`status !== 'closed'` / `computeItemDecorations`)で対応済み。

> 上記は確定仕様。tasks.md / architecture.md / test-plan.md に反映済み。

## 現在のコンテキスト / 前提

- `useMilestonesQuery`(`src/resources/queries.ts:118-123`)は現状
  `queryKey: milestoneKeys.all()` + `queryFn: fetchMilestones` のみ。
- `milestoneKeys.all()` は `["milestone", "all"]`(`src/resources/cache.ts:53-55`)。
- `invalidateMilestoneList`(`src/resources/cache.ts:57-63`)による明示的無効化は更新/追加/
  削除時に発火するが、自動 closed では呼ばれない。
- `components/index.tsx` の QueryClient は `refetchOnWindowFocus: false` のみ(defaultOptions)。
  `refetchInterval` はクエリ個別に指定可能。
- **バックエンド task-11** の猶予チェック間隔 = `MILESTONE_CLOSE_INTERVAL_MINUTES`(デフォルト 60 分)。
  フロントの refetchInterval はこれ以上に短く設定しても意味が薄い(サーバーが閉じる前に
  フェッチしても waiting のまま)ため、**サーバー間隔と揃える**のが設計上自然。

## 構成方針の要点

- `useMilestonesQuery` に `refetchInterval` オプションを追加するだけの軽量変更(推奨)。
  専用フック化や Context 化はしない。
- 間隔は **`.env`(VITE_*)で管理**し、未設定時は 60 分(3,600,000ms)にフォールバック。
  コード内に直書きせず、`import.meta.env` から読む(決定事項 2 反映)。
- サーバーと同じ意味の間隔(producer 側)と揃えることで、過剰ポーリングを避ける(決定事項 1)。
- 自動 closed 後に追加 UI は設けない(一覧から消えるだけ。決定事項 3)。
- 既存のイベントクエリ(`useEventsQuery`)や認証クエリには触らない。
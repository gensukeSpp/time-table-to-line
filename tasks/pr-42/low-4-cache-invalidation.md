# 低-4: イベント変更時に milestone events キャッシュが無効化されない

## 概要
`src/resources/cache.ts` の `milestoneKeys.events` は invalidate されない。`src/hooks/useEventMutation.ts` の event 作成・更新・削除の成功時に `milestoneKeys.events` も invalidate する必要がある。

## 修正方向
- event 作成・更新・削除の成功時に `milestoneKeys.events` も invalidate する（または staleTime: 0 を明示）

## 対象ファイル
- `src/resources/cache.ts`
- `src/hooks/useEventMutation.ts`

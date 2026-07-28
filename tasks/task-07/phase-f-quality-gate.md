# Phase F: 品質ゲート（最終確認）

> **実行方式:** 対話。Phase A〜E 完了後に 1 回だけ実行。
> **リスク:** なし（確認のみ）。
> **所要時間:** 3 分

## F-1: lint 0 error, 0 warning の確認

```bash
bun run lint
```

Expected:
- 0 errors
- 0 warnings
- `--max-warnings 0` のまま通ること

**不合格の場合:** Phase B・D に戻って該当ルールの警告を潰す。

---

## F-2: build 0 error の確認

```bash
bun run build
```

Expected:
- `tsc && vite build` が 0 error
- 出力に `error TS` が含まれない

**不合格の場合:** 該当箇所の型エラーを修正。

---

## F-3: テスト全 PASS

```bash
bun run testrun
```

Expected:
- 全テスト PASS（FAIL 0）
- 出力に `×` が含まれない

**不合格の場合:** テストコードを確認し、リファクタリングで壊れた部分を修正。

---

## F-4: console.log 0 件の確認

```bash
grep -rn "console\.\(log\|warn\|error\|info\)" src/ --include="*.{ts,tsx}" | grep -v "node_modules" | grep -v "\.git" || echo "PASS: 0 console.* calls"
```

Expected: テストファイル以外 0 件。

---

## 合格時のアクション

```bash
git add -A
git commit -m "chore: 全 Phase A-F 完了（lint 0 error, build 0 error, test PASS）"
git push
```

## 不合格時のアクション

1. エラー内容を確認
2. 該当 Phase のファイルに戻り修正
3. 再度 Phase F を実行
4. ループする場合は該当 Phase の設計に問題がある可能性。Phase 設計から見直す。
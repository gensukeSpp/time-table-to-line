# Phase D: 型安全オプションイン（段階的 error 化 + fetch 共通化）

> **実行方式:** 対話（手動）。ESLint ルールを 1 つずつ 'error' に引き上げ、fetch ヘッダー共通化は独立タスク。
> **リスク:** 高。error 化でビルドが通らなくなる可能性あり。1 ルールずつ進める。
> **所要時間:** 各サブタスク 5〜10 分、合計 20〜30 分

## 開始条件

Phase B 完了状態（`no-console`, `no-unused-vars`, `no-unused-expressions`, `exhaustive-deps` が 'warn' で 0 warning）。

---

## D-1: no-console を 'warn' → 'error' に

**Files:**
- Modify: `eslint.config.js`

**変更:**
```typescript
'no-console': 'warn',
```
→
```typescript
'no-console': 'error',
```

**確認:**
```bash
bun run lint
```
Expected: 0 errors, 0 warnings。

**Commit:**
```bash
git commit -m "chore: no-console を error に設定"
```

---

## D-2: no-unused-expressions を 'warn' → 'error' に

**Files:**
- Modify: `eslint.config.js`

**変更:**
```typescript
'@typescript-eslint/no-unused-expressions': 'warn',
```
→
```typescript
'@typescript-eslint/no-unused-expressions': 'error',
```

**確認:**
```bash
bun run lint
```
Expected: 0 errors, 0 warnings。

**Commit:**
```bash
git commit -m "chore: no-unused-expressions を error に設定"
```

---

## D-3: no-unused-vars を 'warn' → 'error' に

**Files:**
- Modify: `eslint.config.js`

**変更:**
```typescript
'@typescript-eslint/no-unused-vars': 'warn',
```
→
```typescript
'@typescript-eslint/no-unused-vars': 'error',
```

**確認:**
```bash
bun run lint
```
Expected: 0 errors, 0 warnings。

**Commit:**
```bash
git commit -m "chore: no-unused-vars を error に設定"
```

---

## D-4: exhaustive-deps を 'warn' → 'error' に

**Files:**
- Modify: `eslint.config.js`

**変更:**
```typescript
'react-hooks/exhaustive-deps': 'warn',
```
→
```typescript
'react-hooks/exhaustive-deps': 'error',
```

**確認:**
```bash
bun run lint
```
Expected: 0 errors, 0 warnings。

**Commit:**
```bash
git commit -m "chore: exhaustive-deps を error に設定"
```

---

## D-5: eslint.config.js の最終形

**Phase D 完了後の eslint.config.js の規則セクション:**
```typescript
rules: {
  ...reactHooks.configs.recommended.rules,
  'react-refresh/only-export-components': [
    'warn',
    { allowConstantExport: true },
  ],
  '@typescript-eslint/no-unused-vars': 'error',
  '@typescript-eslint/no-unused-expressions': 'error',
  'react-hooks/exhaustive-deps': 'error',
  'no-console': 'error',
},
```

無効化ルールが 0 になったことを確認。

---

## D-6: fetch.ts の共通ヘッダー抽出（オプショナル）

**Objective:** `src/resources/fetch.ts` の全 5 関数で重複している `Authorization: Bearer ${postToken}` は、`AxiosClientProvider.tsx` のインターセプターで既に付与されている。fetch 関数から削除する。

**Files:**
- Modify: `src/resources/fetch.ts`
- Modify: `src/lib/AuthInfo.ts`

### 根拠
`AxiosClientProvider.tsx` のリクエストインターセプター（19-30 行目）が全リクエストに Authorization ヘッダーを追加している。fetch.ts の各関数が個別にヘッダーを指定するのは重複であり、将来的な認証方式変更時の修正漏れリスクになる。

### 修正内容

`src/resources/fetch.ts` から Authorization ヘッダーを削除:
```typescript
// 修正前
const { data } = await basicAxios.request<TimelineEventProps[]>({
  url: '/event/all',
  method: 'GET',
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Authorization': `Bearer ${postToken}`,  // ← 削除（インターセプターで付与済み）
    'credentials': 'include',
  }
});

// 修正後（token 引数自体は必要なら残すが、ヘッダー指定からは削除）
const { data } = await basicAxios.request<TimelineEventProps[]>({
  url: '/event/all',
  method: 'GET',
  headers: {
    'Access-Control-Allow-Origin': '*',
    'credentials': 'include',
  }
});
```

`src/lib/AuthInfo.ts` にデフォルトヘッダーとして追加（任意）:
```typescript
const basicAxios = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json; charset=utf-8'",
    'Access-Control-Allow-Origin': '*',  // 追加
  },
  withCredentials: true,  // credentials: 'include' と同等
});
```

### 注意点
- `postToken` 引数は各関数のシグネチャからは削除しない（呼び出し元のインターフェースを変えないため）。あくまでヘッダー指定からの削除のみ。
- インターセプターのトークン取得ロジックが正しく動いていることを確認してから実施する。

**確認:**
```bash
bun run build
```
Expected: 0 errors。

**Commit:**
```bash
git commit -m "refactor: fetch.ts の重複 Authorization ヘッダー削除"
```
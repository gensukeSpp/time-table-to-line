# ライブラリインストール計画

## 概要

yarn → bun 移行、package.json 再構築、ライブラリの最新化を段階的に行う。
コード修正（Mantine 移行、date-fns 統一など）は別タスクとし、この計画はインストールと依存関係の整理のみを対象とする。

---

## 削除するもの（bun 移行に伴う整理）

- `yarn.lock`
- `.yarn/` ディレクトリ全体
- `.yarnrc.yml`
- `package.json` の `engines`, `packageManager`, `resolutions` フィールド

## 削除するファイル（未使用コード）

- `src/DnDApp.tsx` — 未使用、import なし
- `src/lib/ClickOrDouble.js` — 未使用、import なし

---

## Step 1: bun 移行準備

**やること**

1. `bun --version` で bun が入っているか確認
2. `bun init` で雛形生成（後で上書きするので最小限で OK）
3. `.gitignore` に bun 用エントリ（`bun.lock`）を追加

**変更ファイル**

- `package.json`（新規作成）
- `.gitignore`（追記）

---

## Step 2: 基盤ライブラリ（ランタイム＋ビルド）

**dependencies**

| パッケージ | 役割 |
|---|---|
| `react@^19` | React 19（最新メジャー） |
| `react-dom@^19` | React DOM |
| `react-router-dom@^7` | ルーティング |

**devDependencies**

| パッケージ | 役割 |
|---|---|
| `typescript@~5.7` | 型システム |
| `vite@^6` | ビルドツール |
| `@vitejs/plugin-react@^4` | Vite × React 統合 |
| `@vanilla-extract/css@^1` | CSS-in-JS（zero-runtime） |
| `@vanilla-extract/sprinkles@^1` | VE ユーティリティ |
| `@vanilla-extract/vite-plugin@^4` | VE × Vite プラグイン |

**コマンド**

```bash
bun add react@^19 react-dom@^19 react-router-dom@^7
bun add -d typescript@~5.7 vite@^6 @vitejs/plugin-react@^4
bun add -d @vanilla-extract/css @vanilla-extract/sprinkles @vanilla-extract/vite-plugin
```

**確認**

- `bun run dev` で Vite 開発サーバーが起動すること
- `bun run build` でビルドが通ること

---

## Step 3: UI ライブラリ（Mantine v7）

**dependencies**

| パッケージ | 置き換え対象 |
|---|---|
| `@mantine/core@^7` | Chakra UI の全コンポーネントを置き換え |
| `@mantine/hooks@^7` | ユーティリティフック |

**削除する依存**

| パッケージ | 理由 |
|---|---|
| `@chakra-ui/react` | Mantine に置き換え |
| `@chakra-ui/system` | Mantine に置き換え |
| `@emotion/react` | Chakra の依存 |
| `@emotion/styled` | Chakra の依存 |
| `@radix-ui/react-tabs` | Mantine Tabs に置き換え |
| `framer-motion` | 未使用 |
| `classnames` | Mantine/VE で代替可 |

**コマンド**

```bash
bun add @mantine/core@^7 @mantine/hooks@^7
bun remove @chakra-ui/react @chakra-ui/system @emotion/react @emotion/styled @radix-ui/react-tabs framer-motion classnames
```

**注意**

- Mantine の PostCSS セットアップは不要（Vanilla Extract でスタイリングを代替）
- コードの Mantine 移行（import 書き換え、コンポーネント置き換え）は別タスク

---

## Step 4: カレンダー・タイムライン

**dependencies**

| パッケージ | 現在 | 最新 |
|---|---|---|
| `react-big-calendar` | `^1.13.0` | 最新版に更新 |
| `react-calendar-timeline` | `^0.28.0` + `v3 alpha` | `0.30.0-beta.4` に統一 |

**devDependencies**

| パッケージ | 役割 |
|---|---|
| `@types/react-big-calendar` | 型定義 |
| `@types/react-calendar-timeline` | 型定義 |

**コマンド**

```bash
bun add react-big-calendar@latest react-calendar-timeline@0.30.0-beta.4
bun add -d @types/react-big-calendar @types/react-calendar-timeline
bun remove react-calendar-timeline-v3
```

**注意**

- `react-calendar-timeline-v3`（alpha）を削除し、本家 `react-calendar-timeline@0.30.0-beta.4` に統一
- TimelineComponent の import 修正（`react-calendar-timeline-v3` → `react-calendar-timeline`）は別タスク

---

## Step 5: データフェッチ・状態管理

**dependencies**

| パッケージ | 役割 |
|---|---|
| `@tanstack/react-query@^5` | サーバー状態管理 |
| `axios@^1` | HTTP クライアント |

**コマンド**

```bash
bun add @tanstack/react-query@^5 axios@^1
```

---

## Step 6: 日付ライブラリ統一（削除のみ）

**現状**: moment（12ファイルで使用）、date-fns（2ファイル）、dayjs（1ファイル）が混在

**方針**: date-fns に統一するが、コード修正は別タスク。この Step では削除のみ行う。

**削除する依存**

| パッケージ | 理由 |
|---|---|
| `moment` | date-fns に統一 |
| `dayjs` | date-fns に統一 |
| `dot-env` | 未使用、`import.meta.env` で代替 |

**コマンド**

```bash
bun remove moment dayjs dot-env
```

---

## Step 7: テスト・Storybook

**devDependencies**

| パッケージ | 役割 |
|---|---|
| `vitest@^3` | テストランナー |
| `@vitest/ui@^3` | Vitest UI |
| `jsdom@^26` | DOM エミュレーション |
| `@testing-library/react@^16` | React Testing Library |
| `@testing-library/jest-dom@^6` | DOM 用 Jest マッチャー |
| `@testing-library/dom@^10` | DOM Testing Library |
| `storybook@^8` | Storybook |
| `@storybook/react-vite@^8` | Storybook × Vite |
| `@storybook/addon-essentials@^8` | Storybook アドオン |
| `@storybook/addon-interactions@^8` | インタラクションテスト |
| `@storybook/test@^8` | Storybook テスト |

**削除する依存**

| パッケージ | 理由 |
|---|---|
| `@types/jest` | vitest で不要 |
| `@storybook/blocks` | 未使用 |
| `@storybook/addon-onboarding` | オンボーディングのみ |
| `tsconfig-paths-webpack-plugin` | Webpack 不使用 |
| `vite-plugin-checker` | 任意（後で判断） |

**コマンド**

```bash
bun add -d vitest@^3 @vitest/ui@^3 jsdom@^26
bun add -d @testing-library/react@^16 @testing-library/jest-dom@^6 @testing-library/dom@^10
bun add -d storybook@^8 @storybook/react-vite@^8 @storybook/addon-essentials@^8 @storybook/addon-interactions@^8 @storybook/test@^8
bun remove @types/jest @storybook/blocks @storybook/addon-onboarding tsconfig-paths-webpack-plugin vite-plugin-checker
```

---

## Step 8: リンター・フォーマッター

**devDependencies**

| パッケージ | 役割 |
|---|---|
| `eslint@^9` | リンター（フラット設定） |
| `@eslint/js` | ESLint v9 本体設定 |
| `typescript-eslint@^8` | TypeScript ESLint（統合パッケージ） |
| `eslint-plugin-react-hooks@^5` | React Hooks ルール |
| `eslint-plugin-react-refresh@^0` | React Refresh ルール |
| `eslint-plugin-storybook@^0` | Storybook ルール |
| `prettier@^3` | フォーマッター |
| `eslint-config-prettier` | ESLint × Prettier 競合防止 |

**削除する依存**

| パッケージ | 理由 |
|---|---|
| `@typescript-eslint/eslint-plugin` | `typescript-eslint` に統合 |
| `@typescript-eslint/parser` | `typescript-eslint` に統合 |
| `eslint-plugin-prettier` | `eslint-config-prettier` が推奨 |

**コマンド**

```bash
bun add -d eslint@^9 @eslint/js typescript-eslint@^8
bun add -d eslint-plugin-react-hooks@^5 eslint-plugin-react-refresh@^0 eslint-plugin-storybook@^0
bun add -d prettier@^3 eslint-config-prettier
bun remove @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-prettier
```

**注意**

- `.eslintrc.cjs`（従来形式）→ `eslint.config.js`（フラット設定）への移行は別タスク

---

## Step 9: 最終クリーンアップ

**未使用ファイル削除**

```bash
rm src/DnDApp.tsx src/lib/ClickOrDouble.js
```

**残りの不要依存を削除**

```bash
bun remove @vitejs/plugin-react-refresh yarn
```

**注意**: `@vitejs/plugin-react-refresh` は Vite 6 では `@vitejs/plugin-react` に統合済み

---

## Step 10: 動作確認

```bash
# 開発サーバー起動確認
bun run dev

# ビルド確認
bun run build

# リンター確認（通らなくても OK、設定の移行は別タスク）
bun run lint

# テスト確認
bun run testrun

# Storybook 起動確認
bun run storybook
```

---

## 補足：後続タスク（別途計画）

このインストール計画が完了した後、以下のコード修正を別タスクとして進める：

1. **Mantine 移行**: Chakra UI → Mantine コンポーネントの書き換え、import 修正
2. **date-fns 統一**: moment/dayjs → date-fns への書き換え
3. **ESLint フラット設定**: `.eslintrc.cjs` → `eslint.config.js` 移行
4. **TypeScript 型エラー修正**: ライブラリ更新に伴う型の不一致修正
5. **vite.config.ts 整理**: 不要プラグインの削除、設定の最新化
6. **react-calendar-timeline import 修正**: `react-calendar-timeline-v3` → `react-calendar-timeline`
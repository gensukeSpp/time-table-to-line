# 修正タスク 1・2 実装計画: ESLint フラット設定 + Mantine v7 移行

> **For Hermes:** この計画を実装する際は subagent-driven-development を使用し、タスクごとに subagent を起動して 2 段階レビュー（仕様準拠 → コード品質）を行う。

**Goal:** 2 つのコード修正タスクを同時進行で完了させる。

**Architecture:**
- **Task 1**: `.eslintrc.cjs`（CommonJS 従来形式）→ `eslint.config.js`（ESM フラット設定形式）に書き換え。ESLint 9 + typescript-eslint v8 の flat config 対応 API を使用。
- **Task 2**: 7 ファイルに残存する Chakra UI の import を Mantine v7 相当のコンポーネントに置き換え、Radix UI Tabs を Mantine Tabs に置き換え。MantineProvider をアプリルートに追加。各コンポーネントの ChakraProvider ラッパーを削除。

**Tech Stack:** ESLint 9, typescript-eslint v8, @eslint/js v10, Mantine v7, React 19, TypeScript 5.7

---

## 事前確認: 現状分析

### ESLint 設定（現状）
- `.eslintrc.cjs` (CommonJS, 27 行)
- パッケージ: `eslint: ^9`, `@eslint/js: ^10`, `typescript-eslint: ^8`, `eslint-plugin-react-hooks: ^5`, `eslint-plugin-react-refresh: ^0`, `eslint-plugin-storybook: ^0`, `eslint-config-prettier: ^10`
- スクリプト: `eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0`
- flat config では `--ext` 不要、`eslint.config.js` 自身を ignorePatterns に追加

### Mantine 移行（現状）
- Chakra UI インポートあり: 7 ファイル
  1. `src/components/pages/CalendarComponent.tsx` — `chakra` from `@chakra-ui/system`
  2. `src/components/pages/CalendarWrapperComponent.tsx` — `chakra` from `@chakra-ui/system` + Radix Tabs
  3. `src/components/molecules/TimeUpdateButtonComponent.tsx` — `ChakraProvider, Box, Button, Text` from `@chakra-ui/react`
  4. `src/components/molecules/EventUpdateButtonComponent.tsx` — `Button` from `@chakra-ui/react`
  5. `src/components/organisms/InputTitleDialog.tsx` — `ChakraProvider, Box, Text, Input, Button` from `@chakra-ui/react`
  6. `src/components/organisms/InputItem.tsx` — `ChakraProvider, Box, Text, Input, Button, Select` from `@chakra-ui/react`
  7. `src/hooks/useCallingForm.tsx` — `chakra` from `@chakra-ui/system`
- Radix UI インポートあり: 1 ファイル
  1. `src/components/pages/CalendarWrapperComponent.tsx` — `Tabs` from `@radix-ui/react-tabs`
- Mantine インポート: 0 ファイル（まだ移行開始していない）
- `@mantine/core` と `@mantine/hooks` は既に `package.json` に依存あり
- MantineProvider はアプリルートに未設定

### 注目すべき点
- ChakraProvider が各コンポーネントで個別にラップされている → 削除し、MantineProvider はアプリルートに 1 回だけ設置
- `chakra.div` の `flexShrink="0"` や `overflowX="hidden"` は Mantine Box の style / または既存の Vanilla Extract CSS クラスで代替
- TimelineComponent.tsx は `react-calendar-timeline-v3` からインポートしている（タスク 4 の対象なのでこのタスクでは触らない）

---

## 実装タスク

### Task 1: ESLint フラット設定ファイル作成

**Objective:** `eslint.config.js` を作成し、`eslint` スクリプトを flat config 対応に更新する。`console.log` の警告ルールを追加する。

**Files:**
- Create: `eslint.config.js`
- Delete: `.eslintrc.cjs`
- Modify: `package.json`（lint スクリプト修正）

**Step 1: `eslint.config.js` を作成**

```typescript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import storybook from 'eslint-plugin-storybook';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'eslint.config.js'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'storybook': storybook,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'no-console': 'warn',
    },
  },
  prettierConfig,
);
```

**Step 2: lint スクリプトを package.json で更新**

```json
"lint": "eslint . --report-unused-disable-directives --max-warnings 0"
```

変更点: `--ext ts,tsx` を削除（flat config では不要）。eslint.config.js 自身は ignores にあるので区別不要。

**Step 3: `.eslintrc.cjs` を削除**

```bash
git rm .eslintrc.cjs
```

**Step 4: lint が通ることを確認**

```bash
bun run lint
```

Expected: 既存のコードに新しいエラーが追加されていないこと（console.log に warn がでる可能性あり → このタスクでは許容、タスク 2 の後で確認）。

**Step 5: Commit**

```bash
git add eslint.config.js package.json
git rm .eslintrc.cjs
git commit -m "feat #260724: ESLint フラット設定移行（eslint.config.js）"
```

---

### Task 2: MantineProvider をアプリルートに追加

**Objective:** `src/main.tsx` に `<MantineProvider>` を追加し、Mantine v7 の CSS をインポートする。これにより各コンポーネントから個別の ChakraProvider を削除できるようになる。

**Files:**
- Modify: `src/main.tsx`

**Step 1: main.tsx に MantineProvider を追加（修正後）**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as TopRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

import { Index } from './components';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <TopRouter>
    <React.StrictMode>
      <MantineProvider>
        <Index />
      </MantineProvider>
    </React.StrictMode>
  </TopRouter>,
);
```

**Step 2: ビルドが通ることを確認**

```bash
bun run build
```

Expected: ビルド成功（エラーなし）。

**Step 3: Commit**

```bash
git add src/main.tsx
git commit -m "feat #260724: MantineProvider をアプリルートに追加"
```

---

### Task 3: molecules/TimeUpdateButtonComponent — Chakra → Mantine 置き換え

**Objective:** `ChakraProvider, Box, Button, Text` from `@chakra-ui/react` を Mantine 相当に置き換える。

**Files:**
- Modify: `src/components/molecules/TimeUpdateButtonComponent.tsx`

**Step 1: import を書き換え**

Before:
```tsx
import { ChakraProvider, Box, Button, Text } from "@chakra-ui/react";
```

After:
```tsx
import { Box, Button, Text } from '@mantine/core';
```

**Step 2: ChakraProvider ラッパーを削除**

Before:
```tsx
return (
  <ChakraProvider>
    {timeChangeEvents.length > 0 &&
      <Box className={updateButtonArea.container} ref={buttonRef}>
        <Button onClick={handleUpdate}>変更する</Button>
        <Text className={updateButtonArea.countText}>変更回数: {timeChangeEvents.length}</Text>
        <Button onClick={handleReset}>リセット</Button>
      </Box>
    }
  </ChakraProvider>
);
```

After:
```tsx
return (
  <>
    {timeChangeEvents.length > 0 &&
      <Box className={updateButtonArea.container} ref={buttonRef}>
        <Button onClick={handleUpdate}>変更する</Button>
        <Text className={updateButtonArea.countText}>変更回数: {timeChangeEvents.length}</Text>
        <Button onClick={handleReset} variant="default">リセット</Button>
      </Box>
    }
  </>
);
```

注意: Mantine v7 の Button はデフォルトで filled スタイル。「リセット」ボタンは `variant="default"` を指定して差別化。

**Step 3: ビルド確認**

```bash
bun run build
```

Expected: ビルド成功。

**Step 4: Commit**

```bash
git add src/components/molecules/TimeUpdateButtonComponent.tsx
git commit -m "feat #260724: TimeUpdateButton Chakra→Mantine 移行"
```

---

### Task 4: molecules/EventUpdateButtonComponent — Chakra → Mantine 置き換え

**Objective:** `Button` from `@chakra-ui/react` を Mantine Button に置き換え。

**Files:**
- Modify: `src/components/molecules/EventUpdateButtonComponent.tsx`

**Step 1: import を書き換え**

Before:
```tsx
import { Button } from '@chakra-ui/react';
```

After:
```tsx
import { Button } from '@mantine/core';
```

**Step 2: JSX はそのまま（Button 名は同じ）**

- `onClick={handleUpdate}` → そのまま（Mantine Button も onClick をサポート）
- `onClick={handleRemove}` → そのまま

**Step 3: ビルド確認**

```bash
bun run build
```

Expected: ビルド成功。

**Step 4: Commit**

```bash
git add src/components/molecules/EventUpdateButtonComponent.tsx
git commit -m "feat #260724: EventUpdateButton Chakra→Mantine 移行"
```

---

### Task 5: organisms/InputTitleDialog — Chakra → Mantine 置き換え

**Objective:** `ChakraProvider, Box, Text, Input, Button` from `@chakra-ui/react` を Mantine 相当に置き換え。

**Files:**
- Modify: `src/components/organisms/InputTitleDialog.tsx`

**Step 1: import を書き換え**

Before:
```tsx
import { ChakraProvider, Box, Text, Input, Button } from '@chakra-ui/react';
```

After:
```tsx
import { Box, Text, TextInput, Button } from '@mantine/core';
```

**Step 2: ChakraProvider ラッパーを削除し、Input を TextInput に変更**

Before:
```tsx
<ChakraProvider>
  <Box>
    <Text>ID {authInfo.type === 'auth' ? authInfo.authId : 'IDなし'}</Text>
    <Text>所属 {authInfo.type === 'auth' ? authInfo.group : 'グループなし'}</Text>
    <Text></Text>
    <Input
      placeholder="やることを入力してください"
      onChange={handleChange}
      value={title}
    />
    <Button onClick={onSubmit}>追加</Button>
    <Text></Text>
  </Box>
</ChakraProvider>
```

After:
```tsx
<Box>
  <Text>ID {authInfo.type === 'auth' ? authInfo.authId : 'IDなし'}</Text>
  <Text>所属 {authInfo.type === 'auth' ? authInfo.group : 'グループなし'}</Text>
  <TextInput
    placeholder="やることを入力してください"
    onChange={handleChange}
    value={title}
  />
  <Button onClick={onSubmit} mt="sm">追加</Button>
</Box>
```

注意: Mantine の Input は HTML `<input>` のラッパーで、単体では `value`/`onChange` を直接受け取らない。`TextInput` を使用する。空の `<Text></Text>` は削除。`<Button mt="sm">` でマージンを追加。

**Step 3: ビルド確認**

```bash
bun run build
```

Expected: ビルド成功。

**Step 4: Commit**

```bash
git add src/components/organisms/InputTitleDialog.tsx
git commit -m "feat #260724: InputTitleDialog Chakra→Mantine 移行"
```

---

### Task 6: organisms/InputItem — Chakra → Mantine 置き換え

**Objective:** `ChakraProvider, Box, Text, Input, Button, Select` from `@chakra-ui/react` を Mantine 相当に置き換え。

**Files:**
- Modify: `src/components/organisms/InputItem.tsx`

**Step 1: import を書き換え**

Before:
```tsx
import { ChakraProvider, Box, Text, Input, Button, Select } from '@chakra-ui/react';
```

After:
```tsx
import { Box, Text, TextInput, NativeSelect, Button } from '@mantine/core';
```

**Step 2: ChakraProvider ラッパーを削除し、コンポーネントを置き換え**

主な変更点:
- `<ChakraProvider>` / `</ChakraProvider>` → 削除
- `<Input>` → `<TextInput>`（value, onChange を直接受け取る）
- `<Select>` → `<NativeSelect>`（Mantine v7 のネイティブセレクト）
- `<Button type='button' backgroundColor='green'>` → `<Button color="green">`
- `<Text fontSize='2rem'>` → `<Text size="xl">` or `<Text style={{ fontSize: '2rem' }}>`
- `<Button textAlign='center'>` → `<Button>`（center はデフォルト）

**Step 3: 修正後の JSX 完全形**

```tsx
return (
  <Box ref={childRef} className={formParent}>
    <Button color="green" onClick={closeClick} className={buttonPosition}>
      <Text style={{ fontSize: '2rem' }} c="white">×</Text>
      <Text c="white">閉じる</Text>
    </Button>
    <Text style={{ fontSize: '2rem' }} fw={700}>{selectedEvent.staff_id}</Text>
    <Text style={{ fontSize: '2rem' }} fw={700} className={boundaryTop}>{selectedEvent.title}</Text>
    <section className={boundaryTop}>
      <Text>内容：</Text>
      <TextInput name="summary" onChange={handleChange} value={eventItem.summary} />
    </section>
    <section className={boundaryTop}>
      <Text>どんな感じ：</Text>
      <NativeSelect
        name="progress"
        value={eventItem.progress}
        onChange={handleChange}
        data={[
          '---進捗を選んでください---',
          ...options.map((option) => option.label),
        ]}
      />
    </section>
    {infoContext === selectedStaff ?
      <section className={boundaryY}>
        <EventUpdateButtons {...eventItem}></EventUpdateButtons>
      </section> : <Box></Box>
    }
  </Box>
  <Box>
    <Dialog>
      <Text>異なるスタッフの、変更はできません</Text>
      <Button onClick={close}>閉じる</Button>
    </Dialog>
  </Box>
);
```

注意: Mantine v7 NativeSelect は `data` プロパティで選択肢を配列で指定する。`<option>` 子要素は使わない。Chakra Select の `value`/`onChange` の継承は NativeSelect でも同様に動作する（`handleChange` は `React.ChangeEvent<HTMLSelectElement>` を受け取る）。

**Step 4: ビルド確認**

```bash
bun run build
```

Expected: ビルド成功。

**Step 5: Commit**

```bash
git add src/components/organisms/InputItem.tsx
git commit -m "feat #260724: InputItem Chakra→Mantine 移行"
```

---

### Task 7: pages/CalendarComponent — chakra.div → Mantine Box 置き換え

**Objective:** `chakra` from `@chakra-ui/system` を Mantine `Box` に置き換え。

**Files:**
- Modify: `src/components/pages/CalendarComponent.tsx`

**Step 1: import を書き換え**

Before:
```tsx
import { chakra } from '@chakra-ui/system';
```

After:
```tsx
import { Box } from '@mantine/core';
```

**Step 2: chakra.div を Box に置き換え**

Before:
```tsx
<chakra.div className={cx(gridArea, topWidth)} flexShrink="0" scrollSnapAlign="start">
  <p>マイタイムテーブル</p>
  <chakra.div overflowX="hidden">
    <DnDCalendar ... />
  </chakra.div>
</chakra.div>
```

After:
```tsx
<Box className={cx(gridArea, topWidth)} style={{ flexShrink: 0, scrollSnapAlign: 'start' }}>
  <p>マイタイムテーブル</p>
  <Box style={{ overflowX: 'hidden' }}>
    <DnDCalendar ... />
  </Box>
</Box>
```

注意: Chakra の `flexShrink="0"` は文字列 prop → Mantine Box では `style={{ flexShrink: 0 }}` で指定。`scrollSnapAlign` も style に含める。または既存の Vanilla Extract CSS クラスで定義済みなら className のみで十分。

**Step 3: ビルド確認**

```bash
bun run build
```

Expected: ビルド成功。

**Step 4: Commit**

```bash
git add src/components/pages/CalendarComponent.tsx
git commit -m "feat #260724: CalendarComponent chakra.div→Mantine Box 移行"
```

---

### Task 8: pages/CalendarWrapperComponent — chakra.div + Radix Tabs → Mantine 置き換え

**Objective:** `chakra` from `@chakra-ui/system` と `Tabs` from `@radix-ui/react-tabs` を Mantine の Box と Tabs に置き換え。

**Files:**
- Modify: `src/components/pages/CalendarWrapperComponent.tsx`

**Step 1: import を書き換え**

Before:
```tsx
import { chakra } from '@chakra-ui/system';
import * as Tabs from "@radix-ui/react-tabs";
```

After:
```tsx
import { Box, Tabs } from '@mantine/core';
```

**Step 2: Radix Tabs → Mantine Tabs に置き換え**

Radix:
```tsx
<Tabs.Root defaultValue='tab1'>
  <Tabs.List className={tabMenu}>
    <Tabs.Trigger value='tab1' className={tabButton}>タイムテーブル</Tabs.Trigger>
    <Tabs.Trigger value='tab2' className={tabButton}>タイムライン</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="tab1">
    <chakra.div className={flexXmandatory}>
      ...
    </chakra.div>
  </Tabs.Content>
  <Tabs.Content value='tab2'>
    <MyHorizonTimeline />
  </Tabs.Content>
</Tabs.Root>
```

Mantine:
```tsx
<Tabs defaultValue='tab1'>
  <Tabs.List className={tabMenu}>
    <Tabs.Tab value='tab1' className={tabButton}>タイムテーブル</Tabs.Tab>
    <Tabs.Tab value='tab2' className={tabButton}>タイムライン</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="tab1">
    <Box className={flexXmandatory}>
      ...
    </Box>
  </Tabs.Panel>
  <Tabs.Panel value='tab2'>
    <MyHorizonTimeline />
  </Tabs.Panel>
</Tabs>
```

Mantine v7 Tabs のマッピング:
- `Tabs.Root` → `Tabs`
- `Tabs.List` → `Tabs.List`
- `Tabs.Trigger` → `Tabs.Tab`
- `Tabs.Content` → `Tabs.Panel`
- `chakra.div` → `Box`

**Step 3: CSS クラス名の調整**

`tabMenu` と `tabButton` の CSS は `CalendarComponentWrapper.css.ts` に定義済み。Mantine Tabs のクラス設計と衝突する可能性があるため、CSS ファイルの調整が必要かもしれない。その場合は `className` の代わりに Mantine の `classNames` API を使用する。

**Step 4: ビルド確認**

```bash
bun run build
```

Expected: ビルド成功。

**Step 5: Commit**

```bash
git add src/components/pages/CalendarWrapperComponent.tsx
git commit -m "feat #260724: CalendarWrapperComponent Chakra+Radix→Mantine 移行"
```

---

### Task 9: hooks/useCallingForm — chakra → Mantine Box 置き換え

**Objective:** `chakra` from `@chakra-ui/system` を Mantine Box に置き換え。

**Files:**
- Modify: `src/hooks/useCallingForm.tsx`

**Step 1: import を書き換え**

Before:
```tsx
import { chakra } from "@chakra-ui/system";
```

After:
```tsx
import { Box } from '@mantine/core';
```

**Step 2: chakra.div を Box に置き換え**

Before:
```tsx
const EditForm: React.FC<PropsWithChildren> = ({children}) => {
  return (
    <chakra.div flexShrink="0" scrollSnapAlign="start"
      className={topWidth}
      onClick={handleOuterFormBubbling}>
        {children}
    </chakra.div>
  )
}
```

After:
```tsx
const EditForm: React.FC<PropsWithChildren> = ({children}) => {
  return (
    <Box style={{ flexShrink: 0, scrollSnapAlign: 'start' }}
      className={topWidth}
      onClick={handleOuterFormBubbling}>
        {children}
    </Box>
  )
}
```

**Step 3: ビルド確認**

```bash
bun run build
```

Expected: ビルド成功。

**Step 4: Commit**

```bash
git add src/hooks/useCallingForm.tsx
git commit -m "feat #260724: useCallingForm chakra→Mantine Box 移行"
```

---

### Task 10: 最終確認 — lint + build 両方を通す

**Objective:** 全タスク完了後、リントとビルドが問題なく通ることを確認する。

**Step 1: lint 実行**

```bash
bun run lint
```

Expected: 既存の警告のみ（console.log の warn は許容）、エラーなし。

**Step 2: ビルド実行**

```bash
bun run build
```

Expected: ビルド成功、エラーなし。

**Step 3: テスト実行**

```bash
bun run testrun
```

Expected: 既存テストが全て PASS。

**Step 4: Storybook ビルド確認（任意）**

```bash
bun run build-storybook
```

Expected: ビルド成功。

---

## テスト / 検証

| 確認項目 | 方法 | 期待結果 |
|---|---|---|
| ESLint が flat config で動作 | `bun run lint` | エラーなし、警告のみ |
| Mantine コンポーネントが正しくレンダリング | `bun run build` | ビルド成功 |
| 既存テストが維持 | `bun run testrun` | 全テスト PASS |
| Chakra UI / Radix UI の import が残っていない | `grep -r "@chakra-ui\|@radix-ui" src/` | 空 |
| Storybook 起動 | `bun run storybook` | 起動成功 |

## リスク・トレードオフ・未解決の質問

1. **Mantine Tabs の CSS クラス衝突**: `CalendarComponentWrapper.css.ts` の `.tabMenu` / `.tabButton` クラスが Mantine Tabs の内部クラスと競合する可能性。CSS の `.tabButton` が Mantine のデフォルトスタイルを上書きできなければ、Mantine の `classNames` プロパティ経由でスタイルを適用する方法に切り替える。

2. **Chakra Select → Mantine NativeSelect の変更**: Chakra の `<Select>` は `<option>` 子要素を使用する。Mantine v7 の `<NativeSelect>` は `data` 配列プロパティを使用する。`handleChange` のイベント型は両方とも `ChangeEvent<HTMLSelectElement>` なので互換性あり。

3. **Chakra Input → Mantine TextInput**: Chakra の `<Input>` は直接 `value`/`onChange` を受け取る。Mantine の `<Input>` コンポーネントは低レベルラッパーでこれらを受け取らない。`<TextInput>` を使用する必要がある。

4. **MantineProvider のテーマ設定**: 今回はデフォルトテーマで動作確認。カスタムテーマ（色やフォント）は別タスクで対応。

5. **console.log の lint 警告**: ESLint flat config に `no-console: 'warn'` を追加した。これは既存の `console.log` が残っているため警告を出すが、コードの動作には影響しない。別タスクで console.log を削除する際に `no-console` ルールを調整する。
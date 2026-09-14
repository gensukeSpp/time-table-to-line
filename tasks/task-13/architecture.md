# architecture.md — 変更対象ファイルと実装設計

## 変更対象ファイル一覧

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `src/components/organisms/MilestoneListTitle.tsx` | Modify | `admin` prop・ゲートを撤廃し、誰でも開けるボタンに |
| `src/components/organisms/MilestoneList.tsx` | Modify | クリックハンドラ／モーダル表示の `isAdmin` ゲート撤廃。`admin={isAdmin}` は詳細モーダルへ渡す形に整理 |
| `src/components/organisms/MilestoneDetailDialog.tsx` | Modify | 非管理者向け読取専用詳細表示を追加（タイトル/ステータス/作成者/グループ/説明/目安日/達成日）。編集フォームは admin のみ |
| `src/components/organisms/EventDetailOverlay.css.ts` | Modify | `overlay` に padding を追加（タイムライン詳細の周囲余白） |
| `src/components/organisms/MilestoneList.test.tsx` | Modify | 「非管理者は詳細ブロック」テストを「非管理者も詳細閲覧（読取専用）」に書き換え |

**バックエンド変更なし**（`light_token_server/` は触らない）。

## 1) MilestoneListTitle — 誰でも開けるボタンに

**変更前（抜粋）**
```tsx
interface MilestoneListTitleProps {
  milestone: MilestoneProps;
  admin: boolean;
  onOpenDetail: (milestone: MilestoneProps) => void;
}

const handleOpen = () => {
  if (!admin) return;
  onOpenDetail(milestone);
};

<UnstyledButton
  className={titleButton}
  onClick={handleOpen}
  disabled={!admin}
  aria-disabled={!admin}
  style={{ cursor: admin ? 'pointer' : 'not-allowed', opacity: admin ? 1 : 0.7 }}
>
  <Text>{milestone.title}</Text>
</UnstyledButton>
```

**変更後（抜粋）**
```tsx
interface MilestoneListTitleProps {
  milestone: MilestoneProps;
  onOpenDetail: (milestone: MilestoneProps) => void;
}

const handleOpen = () => {
  onOpenDetail(milestone);
};

<UnstyledButton className={titleButton} onClick={handleOpen}>
  <Text>{milestone.title}</Text>
</UnstyledButton>
```

- `admin` prop は使用しなくなるため **削除**（残すと lint 未使用エラー）。
- `disabled` / `aria-disabled` / `style` も撤廃し、全ユーザーがクリック可能に。

## 2) MilestoneList — ゲート撤廃

**変更前（抜粋）**
```tsx
const handleOpenDetail = isAdmin ? setSelected : () => undefined;
...
<MilestoneListTitle
  key={milestone.id}
  milestone={milestone}
  admin={isAdmin}
  onOpenDetail={handleOpenDetail}
/>
...
{selected && isAdmin && (
  <MilestoneDetailDialog
    milestone={selected}
    admin={isAdmin}
    onClose={() => setSelected(null)}
  />
)}
```

**変更後（抜粋）**
```tsx
// 誰でも詳細を開ける（isAdmin ゲート撤廃）
...
<MilestoneListTitle
  key={milestone.id}
  milestone={milestone}
  onOpenDetail={setSelected}
/>
...
{selected && (
  <MilestoneDetailDialog
    milestone={selected}
    admin={isAdmin}
    onClose={() => setSelected(null)}
  />
)}
```

- `isAdmin` は詳細モーダルの編集権限制御用に `admin={isAdmin}` として引き続き渡す。
- `handleOpenDetail` の三項は不要になるため `onOpenDetail={setSelected}` に直接渡す。

## 3) MilestoneDetailDialog — 非管理者向け読取専用詳細

`admin` prop の分岐は既存のまま、`!admin` 側の表示を「作成者・グループのみ」から
**マイルストーン詳細一式の読取表示** に拡張する。

**変更後（抜粋）**
```tsx
{!admin ? (
  <>
    <Text>タイトル: {milestone.title}</Text>
    <Text>
      ステータス:{' '}
      {milestone.status === 'open'
        ? '進行中'
        : milestone.status === 'waiting'
          ? '終了待ち（達成日入力済み）'
          : '終了'}
    </Text>
    <Text>作成者名: {creatorName}</Text>
    <Text>グループ名: {groupName}</Text>
    <Text>説明: {milestone.description ?? '（なし）'}</Text>
    <Text>ガイドライン終了日: {milestone.guideline_end_date ?? '（未設定）'}</Text>
    <Text>達成日: {milestone.accomplished_date ?? '（未設定）'}</Text>
  </>
) : (
  <>
    {/* 既存の編集フォーム（タイトル / 説明 / 目安日 / 達成日 の入力 + 更新） */}
  </>
)}
```

- 編集フォーム・更新ボタンは `admin` のみに表示される既存分岐のまま（変更なし）。
- `milestone.description` / `guideline_end_date` / `accomplished_date` は optional のため
  `?? '（なし）'` / `?? '（未設定）'` で fallback。
- `creatorName` / `groupName` は既存の算出ロジックをそのまま使用。

## 4) EventDetailOverlay — 周囲余白

**変更前（`EventDetailOverlay.css.ts`）**
```ts
export const overlay = style({
  position: 'absolute',
  zIndex: 100,
  maxWidth: '320px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  background: '#fff',
});
```

**変更後（`EventDetailOverlay.css.ts`）**
```ts
export const overlay = style({
  position: 'absolute',
  zIndex: 100,
  maxWidth: '320px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  background: '#fff',
  padding: '0.75rem',
});
```

- 「周囲に余白」= 白背景オーバーレイの内側に padding。`AddChildForm` の共有クラス
  `formParent`（Calendar 編集フォームでも使用）には手を入れず、タイムライン専用の
  `EventDetailOverlay` 側で制御する。
- `padding: '0.75rem'` は初回値。実ブラウザ確認で不足なら調整（`tasks.md` の検証手順参照）。

## テスト概略

**既存テストの更新（必須）**: `src/components/organisms/MilestoneList.test.tsx` の
「should block detail dialog for non-admin users」（150-170 行）は、非管理者に
`マイルストーン詳細` が**表示されない**ことを検証するテスト。今回の変更（非管理者でも
詳細モーダルが開く）と**直接矛盾し失敗する**。このテストを
「should open detail dialog for non-admin users (read-only)」に書き換え、
- 非管理者でも「マイルストーン詳細」モーダルが開くこと
- 作成者名等の詳細が表示されること
- 「更新」ボタンが存在しないこと（読取専用）
を検証する。

このテストは既に `useMilestonesQuery` / `useGroupUsersQuery` / `useAuthInfo` /
`useUpdateMilestoneMutation` を vi.mock 済みで、`admin:false` も注入済みのため、
アサーションの向きを反転するだけで良い（新規 spec は不要、DRY）。

既存の「should open detail dialog when title is clicked」（admin, 134 行）は管理者の
閲覧 + 編集を既にカバーしており、そのまま維持する。

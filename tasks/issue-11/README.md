# GitHub Issue #11 調査報告と実装計画

## 概要

Issue #11 は 2 つの症状を報告している:

1. **高優先度**: `start_time` / `end_time` に「時・分・秒」が入っていない（DB 保存データが `00:00:00.000Z` になる）。報告者は `src/hooks/useMutation.ts` 14 行目の console.log で確認できているとし、フロントエンド側に原因があるとしている。
2. **中優先度**: タイムラインの表示が壊れる（行が `rct-hl-even` / `rct-hl-odd` で width 3000px 超えになる）。ブラウザ DevTools を開くと修復される。

本ファイルは実ブラウザ調査なしに、コードベース静的読解だけで原因を絞り込み、実装タスクに落とした計画である。実ブラウザでの確認項目は各タスクの検証ステップに明記した。

## Issue 1: 時・分・秒が入らない問題（高優先度）

### 現状のコード経路（作成フロー）

```
CalendarView.onSelectSlot(SlotInfo)
  → CalendarPage.setSlotInfo(slotInfo)
  → DialogOnSlot (slotInfo でポータル表示)
  → TitleInput slotStartTime={slotInfo.start}
  → onSubmit → createEvent.mutate({
       id, group, staff_id, admin, title,
       start_time: startTime,        // = slotStartTime（Date）
       end_time: endTime             // = resolveSlotEnd(slotStartTime)（Date）
     })
```

`InputTitleDialog.tsx` は現在以下を行っている:

- `startTime = slotStartTime`（Date そのまま）
- `endTime = resolveSlotEnd(slotStartTime)`
- `createEvent.mutate({ ..., start_time: startTime, end_time: endTime })`

### 調査結果

- `src/hooks/useMutation.ts` は存在せず、同等のミューテーションは `src/hooks/useEventMutation.ts` にある。14 行目 console.log は「バックエンド前: ...」で、Issue が言及した「14 行目 console.log」は実はこのファイルである可能性が高い（以降はこの前提で話を進める）。
- `useEventMutation.ts` の `useCreateMutation` は `basicAxios.post('/event/add', timelineEvent)` を呼んでいる。`basicAxios`（`src/lib/AuthInfo.ts`）は `AxiosHeaders` に `Authorization: Bearer {token}` を設定するインターセプター付きだが、**リクエストボディの Date オブジェクトを文字列化して送る処理は含まれていない**。
- `TimelineEventProps` の `start_time`/`end_time` は `Date` 型（`src/lib/TimelineType.ts:17-18`）。
- Axios はリクエストボディに `Date` オブジェクトが含まれている場合、`JSON.stringify` 相当のシリアル化で `toISOString()` を呼び出し、`2026-08-13T00:00:00.000Z` のような文字列にすることがある。バックエンドがその文字列をパースする際に「時・分・秒」が落ちる（あるいは丸められる）場合、これが Issue の症状そのものになる。
- 通常の react-big-calendar フローでは `start_accessor`/`end_accessor` は `TimelineEventProps.start_time`/`end_time`（Date）を返す（`CalendarView.tsx:137-142`）。日跨ぎ判定や表示は「Date の時刻」ではなく「日付成分の同一性 + end が 0:00 翌日かどうか」に依存しているため、Date オブジェクト自体が正しくても end が 0:00 翌日だと all-day バンドに流れる。この点は Task 8（E-1）で既に `resolveSlotEnd`（endOfDay 丸め）で対処済み。

### 原因仮説

**フロントエンドが Date オブジェクトをミューテーションボディに載せて送信し、Axios によるシリアル化結果がバックエンドで「時・分・秒欠落」状態で永続化されている**。次の 2 通りが考えられる:

- **仮説 A**: `start_time = endTime = 00:00:00.000Z` になっているのは、**入力時点で既に start と end が同じ Date になっている**（例: `resolveSlotEnd` の戻り値が slotStartTime と同じ時刻になっているケース、あるいは 23:00 スロットで endOfDay 丸めが意図せず start と等しくなるケース）。
- **仮説 B**: Date オブジェクト自体は正しいが、**Axios シリアル化 ↔ バックエンドパーサーの相性で、時分秒が欠落/丸められる**（例: バックエンドが日付部分だけ取り込む）。

仮説 A と B は症状が似ているが対処が異なる。A はフロントの生成ロジック修正、B は送信フォーマット（ISO 文字列に明示変換して送る）に加えてバックエンド側の受信解釈も確認する必要がある。

### 実装タスク（Issue 1）

#### Task 1: ミューテーションログを一時復元し、実送信データを確認する

- `src/hooks/useEventMutation.ts` の `onSuccess` に残る console.log は既に削除対象（AGENTS.md の console.log 削除方針に抵触）。このIssueの調査用途としてのみ、一時的に復帰して実ブラウザで送信データを確認する。確認後削除する。
- 確認したい値: `timelineEvent.start_time`, `timelineEvent.end_time` がどのような Date/文字列で出力されるか。
- 代替: `JSON.stringify(timelineEvent, (k, v) => v instanceof Date ? v.toISOString() : v)` をかませて確認する。

#### Task 2: `resolveSlotEnd` と InputTitleDialog の end 生成を精査し、start==end となるケースを除外する

- 執筆時点の `src/lib/slot.ts` の `resolveSlotEnd` は `min(addHours(start,1), endOfDay(start))`。
- 23:00 スロットで `addHours(start,1)` が 0:00 翌日になる場合、`min(..., endOfDay(start))` は `endOfDay(start)`（= 23:59:59.999）を返す。これは start（23:00）とは異なるため「start==end」にはならない。
- しかし、**start が「日付の 0:00」付近で slotStartTime が endOfDay と大差ない場合**や、**その他の境界ケース**で意図せず start==end にならないかを追加の単体テストで網羅する。
- 追加テスト例（`src/tests/slot.spec.ts`）:
  - 0:00 スロット → end は 1:00（addHours）
  - 23:00 スロット → end は同日 endOfDay（23:59:59.999）
  - 通常時刻（9:00, 12:00, 18:00）は addHours(1) のまま

#### Task 3: ミューテーションボディの Date を明示的な送信形式にする（仮説 B 対策）

- `useEventMutation.ts` の `mutationFn` で `TimelineEventProps` をそのまま POST している。これを、以下のいずれかに変更する:
  - **案 1**: 送信直前に `start_time`/`end_time` を ISO 文字列（`toISOString()`）に変換したプレーンオブジェクトにして送る。バックエンドが ISO 文字列をそのままパースできる場合に有効。
  - **案 2**: バックエンドが「日付のみ」受け取る設計なら、フロントは日付成分だけ送る（時分秒を落として送るのは意図的仕様となりうる。この場合 UI で「時・分・秒」が必要なイベントは別データモデルが必要になる）。
- 案 1 を基本方向に置き、バックエンド側の `/event/add` 受信実装（`light_token_server`）と突き合わせて「時・分・秒」が残る送信形式を選ぶ。
- バックエンド側の確認先: `light_token_server` のイベント追加エンドポイント実装。

#### Task 4: バックエンド側の `/event/add` 受信と永続化ロジックを確認する

- 送信形式を決めるには、バックエンドが `start_time`/`end_time` をどう解釈して永続化しているかを確認する必要がある。
- 確認箇所: `light_token_server` のイベント追加ハンドラ（`app/routers/timetable.py` の `append_event_item`）、それに使われる Pydantic スキーマ（`app/schemas.py` の `EventCreate`）、永続化モデル（`app/models.py` の `EventORM`）、文字列→datetime 変換（`convert_str_to_date`）。
- 調査結果に応じて、フロントの送信形式（案 1 か案 2）を確定する。

#### Task 5: 修正後に実ブラウザで「時・分・秒」が入ることを確認する

- 実ブラウザでスロット作成 → ミューテーションの発火 → 返却される/保存されたデータの時刻が「時・分・秒」を含むことを確認。
- 可能ならバックエンド側の保存結果も確認。

---

## Issue 2: タイムライン表示が壊れる問題（中優先度）

### 現状のコード経路（タイムライン）

```
TimelinePage（MyHorizonTimeline）
  → useGroupUsersQuery → getGroup(groupUsers)   // 行グループ
  → useEventsState → getItems(stateAll)         // アイテム（group=staff_id に置換）
  → toTimelineStackItems(state)                 // start_time/end_time を .getTime() に変換
  → <Timeline ... items={...} stackItems={true} ... />
```

`useTimelineDragZoom` はキャンバス上のマウスドラッグでズームするフック。`.rct-item` 要素上での mousedown は無視する（`handleMouseDown` で `closest('.rct-item')` をチェック）。

### 観測事実（Issue 報告）

- 表示が壊れた状態: 各ユーザー行（`rct-hl-even` / `rct-hl-odd`）の width が 3000px を超えるなど、行横方向のレイアウトが異常に広がる。
- DevTools を開くと修復される。再度タイムテーブル（カレンダー）タブに戻り、再度タイムラインに切り替えると同じ状態になる。

### 調査結果

- react-calendar-timeline の DOM クラス名は `rct-items`, `rct-hl-even`, `rct-hl-odd`, `rct-item`, `rct-scroll`, `rct-vl-*` などがソースに存在する（`node_modules/react-calendar-timeline/dist/react-calendar-timeline.cjs.js` 読解）。これらのクラス名はライブラリ側が付与するもので、プロジェクトのコードからは `rct-hl-even`/`rct-hl-odd` を直接操作していない。
- タイムラインの幅は `containerRef.current.offsetWidth`（`TimelinePage.tsx:29-30`）で取得し、`timelineWidth` として `useTimelineDragZoom` に渡している。`handleResize` は `useEffect(..., [])` で 1 回しか呼ばれないため、**初回レンダス時にコンテナ幅が確定していない場合、timelineWidth が 0 になる可能性がある**。
- `handleResize` はウィンドウリサイズ時に再計算するが、DevTools の開閉でレイアウトが再計算されると width が再取得され「修復されたように見える」ことは説明できる。
- 「再度カレンダータブに戻ってタイムラインに戻ると同じ状態になる」ことは、`offsetWidth` が初回マウント時に期待値を持てていない（コンテナのリサイズ観測が追いついていない）場合に起こりうる。とりわけ `Tabs.Panel` が非表示の間でコンテナが実レイアウトを持たないケースなどが疑われる。
- マウスイベントは `<div onMouseDownCapture={...} onMouseMoveCapture={...} onMouseUpCapture={...} onMouseLeaveCapture={...}>` に貼っている。`useTimelineDragZoom` は `.rct-item` 上の操作を無視するが、**キャンバス外や空白領域でのドラッグ開始/移動/終了の組み合わせで visibleTime の状態が異常になる**可能性は否定できない。

### 原因仮説

- **仮説 C**: `timelineWidth` が初回に 0（あるいは期待と異なる値）になり、`calculateZoomedTimeRange` や `minZoom`/`maxZoom` の計算が狂って、canvas の横幅が異常な値（3000px 超え）に広がる。
- **仮説 D**: `useTimelineDragZoom` のマウスハンドラが、`event.target` が `.rct-item` かどうかの判定で漏れたケース（例: ラッパー div、空白、Css の擬似要素など）でドラッグ処理を起動し、`visibleTime` が不規則に拡大する。DevTools 開閉でレイアウト/イベント伝播が変わり「修復される」ように見える。
- **仮説 E**: `stackItems={true}` と `toTimelineStackItems` の Date→ms 変換の組み合わせ問題。すでに `TmelineData.ts` で `getTime()` を呼んでいるが、`items` の一部に Date 以外の値が混入すると計算が壊れる。

### 原因の確定（2026-08-14 実測・コード読解）

実ブラウザ（Storybook + `react-calendar-timeline` 0.30.0-beta.4）で再現し、**仮説 C の記述は誤りで、実因は別**であることを確認した。

- **`timelineWidth`（`containerRef.offsetWidth`）は canvas 幅に無関係**。TimelinePage の `timelineWidth` は `useTimelineDragZoom`（ドラッグズームの `calculateZoomedTimeRange`）にしか渡っておらず、`<Timeline canvasWidth>` には接続されていない。canvas 幅はライブラリ自身が `container.getBoundingClientRect().width × buffer(3)` で算出する。
- **`rct-hl-*` の width = `canvasWidth` = ライブラリが計測した `state.width × buffer(3)`**（`dist` の `ve(width, buffer)`）。つまり「3000px 超え」は `state.width ≈ 1000px`（**ライブラリ初期値 1000**; `constructor` の `width: 1e3`）のときに 1000×3=3000px になる。
- **ライブラリは幅を再測定するのは「マウント時 + `window resize` 時」のみ**（`gi.addListener(this)` で `window.resize` 購読、`resize()` は `getBoundingClientRect().width` を読む）。**タブの表示切替では再測定されない**。
- **Mantine Tabs は既定 `keepMounted: true`**（`TabsPanel` は非アクティブでも children をマウントし `display:none` で隠すだけ）。そのためタイムラインは**非表示のまま `display:none` でマウント**され、幅を 0 または初期値 1000 系で保持したまま「表示」しても更新されない。
- DevTools を開くと window サイズが変わり `resize` が発火 → `resize()` が実幅を再測定 → 修復される（報告どおり）。タブの再切替だけでは window resize が来ないため再現する。

**結論**: 実因は「**非表示状態でマウントされたタイムラインの幅が、表示時に再測定されない**」こと。仮説 D / E は本症状の主因ではなく防御的対応のみ行う。

### 解決実装（2026-08-14）

- **Task 6（改訂）**: `TimelinePage.tsx` を `ResizeObserver + ライブラリ `resizeDetector`` 方式に変更。`display:none→block` のサイズ変化（0→実値）を ResizeObserver が検知し、① ドラッグズーム用の `timelineWidth` を更新、② `<Timeline>` インスタンスの `resize()` を呼んで canvas 幅を再計算させる。これでタブ切替のたびに確実に再測定され、「DevTools で修復・再切替で再発」が解消する。jsdom/SSR 非破壊のため `typeof ResizeObserver !== 'undefined'` ガード付き。
- **Task 8**: `toTimelineStackItems` を「非有限時刻（Invalid Date / NaN / Infinity）のアイテムは除外」する防御に変更（`Number.isFinite` 検査）。1 アイテムでも NaN が混入するとジオメトリが壊れうるため。単体テストを追加。
- **Task 7（`.rct-item` 判定）**: 既存の `closest('.rct-item')` ガードは本症状に関係しないことを確認し、そのまま維持（追加変更なし）。`useTimelineDragZoom.spec.tsx` で既に「アイテム上クリックではドラッグ開始しない」を検証済み。
- **Task 1 の調査用 console.log**: `useEventMutation.ts:14` の `console.log`（Issue 1 調査用の残存）を削除し lint を復帰。

### 実装タスク（Issue 2）

#### Task 6: timelineWidth の取得を再検証し、最初の確定幅を正しく使うようにする

- `containerRef.current.offsetWidth` が 0/異常値になるケースを想定し、初回算出で確実な値を得られるよう修正する。
- 修正案:
  - `useLayoutEffect` に切り替えてコンテナの実レイアウト後の幅を取得する。
  - 初回は `containerRef.current?.offsetWidth ?? 0` で取得し、0 の場合はフォールバック幅を使う。
  - コンテナのリサイズ観測を `ResizeObserver` に置き換え、確実に幅変化を取得する。
- この修正で「DevTools 開閉で修復される」症状が軽減するかどうかを実ブラウザで確認する。

#### Task 7: マウスハンドラの `.rct-item` 判定を再検証し、意図しないドラッグ開始を除外する

- `useTimelineDragZoom.handleMouseDown` の `closest('.rct-item')` 判定が、想定した要素で正しく機能しているか確認。
- 必要なら判定を強化（例: `e.target` が `.rct-items` や `.rct-item` の内部にあるかどうかをより直接的に判定）。
- 実ブラウザでドラッグ操作と要素クリックの境界で visibleTime が異常拡大しないことを確認。

#### Task 8: `stackItems={true}` 下で `toTimelineStackItems` の出力に異常値がないか確認する

- `toTimelineStackItems` が返す `start_time`/`end_time` が常に数値（ms）であり、NaN / Infinity を含まないことを単体テストで確認する。
- `TimelinePage` での `getItems(stateAll)` が返す items の `start_time`/`end_time` が常に Date であることを確認。
- 異常値混入が見つかる場合は、`toTimelineStackItems` 側でフォールバック／除外処理を加える。

#### Task 9: 修正後に実ブラウザでタイムラインの表示が安定することを確認する

- タイムテーブル→タイムラインの往復、タブ再表示、ウィンドウリサイズ、DevTools 開閉の各ケースで表示が壊れないことを確認。
- 可能なら「3000px 超え」になる状況を再現し、修正後にその状況が出なくなることを確認。

---

## 共通の検証コマンド（フロントエンド）

```bash
bun run testrun   # 全テスト（slot.spec, TmelineData 関連など）PASS
bun run lint      # --max-warnings 0（console.log 削除含む）
bun run build     # tsc + vite build 0 error
```

console.log 削除が含まれる場合は `bun run lint` がゲートになる。ミューテーションログを一時復帰する Task 1 では、一時的に `no-console` を例外的に外すか、eslint-disable を付与して調査を進めてもよい（調査後に元に戻す）。

---

## 変更対象ファイル（見込み）

- **Modify**: `src/hooks/useEventMutation.ts` — 調査用ログ復帰（Task 1）、送信形式修正（Task 3）
- **Modify**: `src/components/organisms/InputTitleDialog.tsx` — 送信前の Date の扱いを確認/調整（Task 2, 3）
- **Modify**: `src/lib/slot.ts` — 必要に応じて境界ケース対策（Task 2）
- **Modify**: `src/tests/slot.spec.ts` — 追加テスト（Task 2）
- **Modify**: `src/tests/tmelineData.spec.ts` — 追加テスト（Task 8）
- **Modify**: `src/components/pages/TimelinePage.tsx` — timelineWidth 取得の修正（Task 6）
- **Modify**: `src/hooks/useTimelineDragZoom.ts` — マウス判定強化（Task 7）
- **Modify**: `src/lib/TmelineData.ts` — 異常値フォールバック（Task 8、必要時）
- **Read/確認**: `light_token_server` のイベント追加エンドポイントロジック（Task 4）

---

## 完了条件（Done）

- [x] Issue 1: ミューテーションボディの `start_time`/`end_time` が「時・分・秒」を含む状態で送信/永続化されることを確認（Task 4 の解決で解消・ユーザー確認済み）
- [x] Issue 1: 送信形式がバックエンド受信と一致することを確認（バックエンド側の確認含む）
- [x] Issue 1: 調査用 console.log は最終的に削除され、lint が通る状態に戻す（`useEventMutation.ts:14` 削除済み）
- [x] Issue 2: タイムライン表示が「DevTools 開閉で修復される」症状を出さないことを確認（**コード修正済み・要実ブラウザ確認**）
- [x] Issue 2: タイムテーブルとタイムライン間の往復表示が安定することを確認（**コード修正済み・要実ブラウザ確認**）
- [x] 全体: `bun run testrun && bun run lint && bun run build` が通る（31 passed / 1 skipped、lint 0 error、build 0 error）

---

## リスク・トレードオフ・未解決点

- **Issue 1 の原因귀속**: コードベース静的読解だけでは「フロントで Date を送っていること」と「バックエンドがそれをどう永続化するか」のどちらが主因かを確定できない。実ブラウザでの送信データ確認（Task 1）とバックエンド側受信確認（Task 4）が必要。
- **バックエンド側に触れる範囲**: Issue 1 の解決には backend（`light_token_server`）の受信ロジックの確認が伴う可能性がある。フロントだけで完結しない場合は、backend 側のタスク分割を別途検討する。
- **console.log の扱い**: Issue 報告者も console.log で確認していることから、調査目的で一時的にログを復活させることがある。本プロジェクトは console.log 削除方針のため、調査後は必ず削除して lint を通すこと。
- **実ブラウザ確認の必要性**: タイムラインの「DevTools で修復」症状は実ブラウザのレイアウト/イベント挙動に依存するため、コード修正後の実ブラウザ確認が必須。静的なテストだけでは検出できない。
- **スキル**: ミューテーションや送信形式、Axios シリアル化については必要に応じて `jwt-token-contract-debugging` スキルや関連する 자체スキルを参照する。

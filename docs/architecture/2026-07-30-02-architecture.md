# Architecture Snapshot: 2026-07-30-02

## Purpose
UIコンポーネントの構造化、新規ページコンポーネントの作成、およびStorybookのセットアップ。

## Overview
- **Component Reorganization**: コンポーネントをAtomic Designの原則に従って、より適切に再配置。
- **New Components**: 新規ページコンポーネント（CalendarPage, CalendarView, TimelinePage）を追加し、レイアウトを最適化。
- **Storybook**: コンポーネントのドキュメント化と開発効率向上のため、Storybookストーリーを追加。

## Key Design Decisions
- Atomic Design に基づくコンポーネント分離による保守性の向上。
- Storybook を使用したコンポーネントの分離開発とテストの容易化。

## Changed Files
- src/components/templates/ViewComponents.tsx
- src/stories/Calendar.stories.tsx
- src/stories/Timeline.stories.tsx

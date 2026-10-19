import { style } from '@vanilla-extract/css';

export const toolbar = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '1rem',
  marginBottom: '0.5rem',
});

// 管理者向けボタンの縦積みコンテナ（マイルストーン作成 / 閉じたマイルストーン）
export const adminBar = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: '0.5rem',
});

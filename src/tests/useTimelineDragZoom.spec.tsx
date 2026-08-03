import { act, renderHook } from '@testing-library/react';
import type { MouseEvent } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { useTimelineDragZoom } from '../hooks/useTimelineDragZoom';

const INITIAL_START = new Date('2025-09-19T06:00:00').getTime();
const INITIAL_END = new Date('2025-09-19T18:00:00').getTime();
const TIMELINE_WIDTH = 1000;

// フックのハンドラが期待する MouseEvent の最小実装を作成する
const createMouseEvent = (
  clientX: number,
  target?: HTMLElement
): MouseEvent<HTMLElement> =>
  ({
    clientX,
    preventDefault: vi.fn(),
    target: target ?? document.createElement('div'),
  }) as unknown as MouseEvent<HTMLElement>;

describe('useTimelineDragZoom', () => {
  it('初期状態で渡した表示範囲を返す', () => {
    const { result } = renderHook(() =>
      useTimelineDragZoom(INITIAL_START, INITIAL_END, TIMELINE_WIDTH)
    );
    expect(result.current.visibleTimeStart).toBe(INITIAL_START);
    expect(result.current.visibleTimeEnd).toBe(INITIAL_END);
  });

  it('updateVisibleTime で表示範囲を直接更新できる', () => {
    const { result } = renderHook(() =>
      useTimelineDragZoom(INITIAL_START, INITIAL_END, TIMELINE_WIDTH)
    );
    const newStart = INITIAL_START + 1000;
    const newEnd = INITIAL_END + 1000;
    act(() => {
      result.current.updateVisibleTime(newStart, newEnd);
    });
    expect(result.current.visibleTimeStart).toBe(newStart);
    expect(result.current.visibleTimeEnd).toBe(newEnd);
  });

  it('イベントアイテム上のクリックではドラッグを開始しない', () => {
    const { result } = renderHook(() =>
      useTimelineDragZoom(INITIAL_START, INITIAL_END, TIMELINE_WIDTH)
    );
    const itemEl = document.createElement('div');
    itemEl.className = 'rct-item';
    act(() => {
      result.current.handleMouseDown(createMouseEvent(500, itemEl));
    });
    // ドラッグが開始されていないため、大きく移動しても表示範囲は変わらない
    act(() => {
      result.current.handleMouseMove(createMouseEvent(800, itemEl));
    });
    expect(result.current.visibleTimeStart).toBe(INITIAL_START);
    expect(result.current.visibleTimeEnd).toBe(INITIAL_END);
  });

  it('アイテム外での mousedown でドラッグを開始し、移動でズームする', () => {
    const { result } = renderHook(() =>
      useTimelineDragZoom(INITIAL_START, INITIAL_END, TIMELINE_WIDTH)
    );
    act(() => {
      result.current.handleMouseDown(createMouseEvent(500));
    });
    act(() => {
      result.current.handleMouseMove(createMouseEvent(800));
    });
    // ドラッグ距離 300 でズームが発生し、表示範囲が変化する
    expect(result.current.visibleTimeStart).not.toBe(INITIAL_START);
    expect(result.current.visibleTimeEnd).not.toBe(INITIAL_END);
    // 中心時刻は維持される
    const oldCenter = (INITIAL_START + INITIAL_END) / 2;
    const newCenter =
      (result.current.visibleTimeStart + result.current.visibleTimeEnd) / 2;
    expect(newCenter).toBe(oldCenter);
  });

  it('ドラッグ中の微小な移動（DRAG_SENSITIVITY 未満）では更新しない', () => {
    const { result } = renderHook(() =>
      useTimelineDragZoom(INITIAL_START, INITIAL_END, TIMELINE_WIDTH)
    );
    act(() => {
      result.current.handleMouseDown(createMouseEvent(500));
    });
    // ドラッグ開始点から 1px の移動（DRAG_SENSITIVITY=2 未満）
    act(() => {
      result.current.handleMouseMove(createMouseEvent(501));
    });
    expect(result.current.visibleTimeStart).toBe(INITIAL_START);
    expect(result.current.visibleTimeEnd).toBe(INITIAL_END);
  });

  it('ドラッグ中でない場合は handleMouseMove で更新しない', () => {
    const { result } = renderHook(() =>
      useTimelineDragZoom(INITIAL_START, INITIAL_END, TIMELINE_WIDTH)
    );
    act(() => {
      result.current.handleMouseMove(createMouseEvent(800));
    });
    expect(result.current.visibleTimeStart).toBe(INITIAL_START);
    expect(result.current.visibleTimeEnd).toBe(INITIAL_END);
  });

  it('handleMouseUp でドラッグを終了する', () => {
    const { result } = renderHook(() =>
      useTimelineDragZoom(INITIAL_START, INITIAL_END, TIMELINE_WIDTH)
    );
    act(() => {
      result.current.handleMouseDown(createMouseEvent(500));
    });
    act(() => {
      result.current.handleMouseUp();
    });
    // ドラッグ終了後は移動しても更新されない
    act(() => {
      result.current.handleMouseMove(createMouseEvent(800));
    });
    expect(result.current.visibleTimeStart).toBe(INITIAL_START);
    expect(result.current.visibleTimeEnd).toBe(INITIAL_END);
  });

  it('handleMouseLeave でドラッグ中の場合は終了する', () => {
    const { result } = renderHook(() =>
      useTimelineDragZoom(INITIAL_START, INITIAL_END, TIMELINE_WIDTH)
    );
    act(() => {
      result.current.handleMouseDown(createMouseEvent(500));
    });
    act(() => {
      result.current.handleMouseLeave();
    });
    act(() => {
      result.current.handleMouseMove(createMouseEvent(800));
    });
    expect(result.current.visibleTimeStart).toBe(INITIAL_START);
    expect(result.current.visibleTimeEnd).toBe(INITIAL_END);
  });

  it('handleMouseLeave でドラッグ中でない場合は何もしない', () => {
    const { result } = renderHook(() =>
      useTimelineDragZoom(INITIAL_START, INITIAL_END, TIMELINE_WIDTH)
    );
    act(() => {
      result.current.handleMouseLeave();
    });
    expect(result.current.visibleTimeStart).toBe(INITIAL_START);
    expect(result.current.visibleTimeEnd).toBe(INITIAL_END);
  });
});

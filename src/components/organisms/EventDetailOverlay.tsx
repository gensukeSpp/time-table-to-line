import { useEffect, useRef } from 'react';
import { Box } from '@mantine/core';
import { TimelineEventProps } from '../../lib/TimelineType';
import { AddChildForm } from './InputItem';
import { overlay } from './EventDetailOverlay.css';

interface EventDetailOverlayProps {
  event: TimelineEventProps;
  position: { top: number; left: number };
  readOnly: boolean;
  onClose: () => void;
}

export const EventDetailOverlay = ({ event, position, readOnly, onClose }: EventDetailOverlayProps) => {
  const rootRef = useRef<HTMLDivElement>(null);

  // モーダルの自然な閉じ操作（PR #21 レビュー指摘）:
  // - オーバーレイ外クリックで閉じる
  // - Escape キーで閉じる
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <Box ref={rootRef} className={overlay} style={{ top: position.top, left: position.left }}>
      <AddChildForm selectedEvent={event} closeClick={onClose} readOnly={readOnly} />
    </Box>
  );
};

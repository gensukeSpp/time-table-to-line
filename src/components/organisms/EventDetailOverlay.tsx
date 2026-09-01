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

export const EventDetailOverlay = ({ event, position, readOnly, onClose }: EventDetailOverlayProps) => (
  <Box className={overlay} style={{ top: position.top, left: position.left }}>
    <AddChildForm selectedEvent={event} closeClick={onClose} readOnly={readOnly} />
  </Box>
);
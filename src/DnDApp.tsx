import { FC, useState, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, Event } from 'react-big-calendar'
import withDragAndDrop, { withDragAndDropProps } from 'react-big-calendar/lib/addons/dragAndDrop'
import { format } from 'date-fns/format'
import { parse } from 'date-fns/parse'
import { startOfWeek } from 'date-fns/startOfWeek'
import { getDay } from 'date-fns/getDay'
// import enUS from 'date-fns/locale/en-US'
import { ja } from 'date-fns/locale/ja'
import { addHours } from 'date-fns/addHours'
import { startOfHour } from 'date-fns/startOfHour'

import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const DnDApp: FC = () => {
  const [events, setEvents] = useState<Event[]>([
    {
      title: 'Learn cool stuff',
      start,
      end
    },
  ])

  const onEventResize: withDragAndDropProps['onEventResize'] = data => {
    const { start, end } = data

    setEvents(currentEvents => {
      const firstEvent = {
        start: new Date(start),
        end: new Date(end)
      }
      return [...currentEvents, firstEvent]
    });
    console.log(`Resize: ${JSON.stringify(events)}`);
  }

  const onEventDrop: withDragAndDropProps['onEventDrop'] = data => {
    console.log(`Drop: ${data}`)
  }

  const handleSelectEvent = useCallback(
    (event: Event) => window.alert(event.title),
    []
  )

  // const [myEvents, setMyEvents] = useState<Event[]>([])

  const handleSelectSlot = useCallback(
    (data: Event) => {
      const { start, end } = data
      const title = window.prompt('New Event name')
      if (title) {
        setEvents((prev) => [...prev, { start, end, title }])
      }
    },
    [setEvents]
  )

  return (
    <DnDCalendar
      defaultView='week'
      events={events}
      localizer={localizer}
      onEventDrop={onEventDrop}
      onEventResize={onEventResize}
      resizable
      onSelectEvent={handleSelectEvent}
      onSelectSlot={handleSelectSlot}
      selectable
      style={{ height: '100vh' }}
    />
  )
}

// const locales = {
//   'en-US': enUS,
// }
const locales = {
  'ja-JP': ja,
}

const endOfHour = (date: Date): Date => addHours(startOfHour(date), 1)
const now = new Date()
const start = endOfHour(now)
const end = addHours(start, 2)
// The types here are `object`. Strongly consider making them better as removing `locales` caused a fatal error
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})
//\@ts-ignore
const DnDCalendar = withDragAndDrop(Calendar)

export default DnDApp

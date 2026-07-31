
import { DateLocalizer, Navigate, TitleOptions } from 'react-big-calendar';
// 🙆‍♂️ valid (@ts-expect-error のあとに続けて説明を書く必要がある)
// @ts-expect-error どうしても "foo" から bar() が呼びたいんです
import * as TimeGrid from 'react-big-calendar/lib/TimeGrid'
import { addDays, startOfDay, isBefore, isEqual } from 'date-fns';
import 'react-calendar-timeline/style.css'

export const MyWeek = () => {

  return <TimeGrid />
}

MyWeek.range = (date: Date) => {
  const start = date;
  const end = addDays(start, 2);
  let current = start;
  const range = [];

  while (isBefore(startOfDay(current), startOfDay(end)) || isEqual(startOfDay(current), startOfDay(end))) {
    range.push(current);
    current = addDays(current, 1);
  }

  return range;
}

MyWeek.navigate = (date: Date, action: 'PREV' | 'NEXT' | 'DATE', localizer: DateLocalizer) => {
  switch (action) {
    case Navigate.PREVIOUS:
      return localizer.add(date, -3, 'day')

    case Navigate.NEXT:
      return localizer.add(date, 3, 'day')

    default:
      return date
  }
}

MyWeek.title = (date: Date, options: TitleOptions): string => {
  const [start, ...rest] = MyWeek.range(date);
  options.formats = [];
  return options.formats.concat(start.toISOString())
    + ' — ' + options.formats.concat(rest.pop()!.toISOString());
}

export default MyWeek;

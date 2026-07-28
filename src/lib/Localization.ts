import { dateFnsLocalizer } from 'react-big-calendar';
import {
  format, parse, startOfWeek, getDay,
  addHours, startOfHour,
} from 'date-fns';
import { ja } from 'date-fns/locale';

// const locales = {
//   'en-US': enUS,
// }
const locales = {
  'ja-JP': ja,
}

const endOfHour = (date: Date): Date => addHours(startOfHour(date), 1);

const now = new Date();
const fnsStart = endOfHour(now);
const fnsEnd = addHours(fnsStart, 2);
// The types here are `object`. Strongly consider making them better as removing `locales` caused a fatal error
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

export default localizer;
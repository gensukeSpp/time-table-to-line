import { dateFnsLocalizer, momentLocalizer, dayjsLocalizer } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
// import enUS from 'date-fns/locale/en-US';
import { ja } from 'date-fns/locale/ja';
import { addHours } from 'date-fns/addHours';
import { startOfHour } from 'date-fns/startOfHour';

import moment from 'moment';
import dayjs from 'dayjs'

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
// const localizer = dayjsLocalizer(dayjs)
// const localizer = momentLocalizer(moment)

export default localizer;

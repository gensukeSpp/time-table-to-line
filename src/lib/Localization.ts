import { dateFnsLocalizer } from 'react-big-calendar';
import {
  format, parse, startOfWeek, getDay,
} from 'date-fns';
import { ja } from 'date-fns/locale';

// const locales = {
//   'en-US': enUS,
// }
const locales = {
  'ja-JP': ja,
}

// The types here are `object`. Strongly consider making them better as removing `locales` caused a fatal error
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

export default localizer;
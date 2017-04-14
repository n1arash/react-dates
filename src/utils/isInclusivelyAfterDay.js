import moment from 'moment-jalali';

import isSameDay from './isSameDay';
moment.loadPersian()
export default function isInclusivelyAfterDay(a, b) {
  if (!moment.isMoment(a) || !moment.isMoment(b)) return false;
  return a.isAfter(b) || isSameDay(a, b);
}

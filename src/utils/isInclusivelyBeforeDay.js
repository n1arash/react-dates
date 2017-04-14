import moment from 'moment-jalali';

import isSameDay from './isSameDay';

export default function isInclusivelyBeforeDay(a, b) {
  moment.loadPersian()
  if (!moment.isMoment(a) || !moment.isMoment(b)) return false;
  return a.isBefore(b) || isSameDay(a, b);
}

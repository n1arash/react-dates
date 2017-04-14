import moment from 'moment-jalali';

import isSameDay from './isSameDay';

export default function isNextDay(a, b) {
  moment.loadPersian()
  if (!moment.isMoment(a) || !moment.isMoment(b)) return false;
  const nextDay = moment(a).add(1, 'jDay');
  return isSameDay(nextDay, b);
}

import moment from 'moment-jalali';

export default function isSameDay(a, b) {
  moment.loadPersian()
  if (!moment.isMoment(a) || !moment.isMoment(b)) return false;
  // Compare least significant, most likely to change units first
  // Moment's isSame clones moment inputs and is a tad slow
  return a.date() === b.date() &&
    a.month() === b.month() &&
    a.year() === b.year();
}

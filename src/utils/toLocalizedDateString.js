import moment from 'moment-jalali';

import toMomentObject from './toMomentObject';

import { DISPLAY_FORMAT } from '../../constants';

export default function toLocalizedDateString(date, currentFormat) {
  moment.loadPersian()
  const dateObj = moment.isMoment(date) ? date : toMomentObject(date, currentFormat);
  if (!dateObj) return null;

  return dateObj.format(DISPLAY_FORMAT);
}

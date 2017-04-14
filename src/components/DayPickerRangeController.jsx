import React from 'react';
import PropTypes from 'prop-types';
import momentPropTypes from 'react-moment-proptypes';
import { forbidExtraProps, nonNegativeInteger } from 'airbnb-prop-types';
import moment from 'moment';

import { DayPickerPhrases } from '../defaultPhrases';
import getPhrasePropTypes from '../utils/getPhrasePropTypes';

import isTouchDevice from '../utils/isTouchDevice';

import isInclusivelyAfterDay from '../utils/isInclusivelyAfterDay';
import isInclusivelyBeforeDay from '../utils/isInclusivelyBeforeDay';
import isNextDay from '../utils/isNextDay';
import isSameDay from '../utils/isSameDay';

import getVisibleDays from '../utils/getVisibleDays';
import isDayVisible from '../utils/isDayVisible';

import toISODateString from '../utils/toISODateString';

import FocusedInputShape from '../shapes/FocusedInputShape';
import ScrollableOrientationShape from '../shapes/ScrollableOrientationShape';

import {
  START_DATE,
  END_DATE,
  HORIZONTAL_ORIENTATION,
  DAY_SIZE,
} from '../../constants';

import DayPicker, { defaultProps as DayPickerDefaultProps } from './DayPicker';

const propTypes = forbidExtraProps({
  startDate: momentPropTypes.momentObj,
  endDate: momentPropTypes.momentObj,
  onDatesChange: PropTypes.func,

  focusedInput: FocusedInputShape,
  onFocusChange: PropTypes.func,
  onClose: PropTypes.func,

  keepOpenOnDateSelect: PropTypes.bool,
  minimumNights: PropTypes.number,
  isOutsideRange: PropTypes.func,
  isDayBlocked: PropTypes.func,
  isDayHighlighted: PropTypes.func,

  // DayPicker props
  enableOutsideDays: PropTypes.bool,
  numberOfMonths: PropTypes.number,
  orientation: ScrollableOrientationShape,
  withPortal: PropTypes.bool,
  initialVisibleMonth: PropTypes.func,
  daySize: nonNegativeInteger,

  navPrev: PropTypes.node,
  navNext: PropTypes.node,

  onPrevMonthClick: PropTypes.func,
  onNextMonthClick: PropTypes.func,
  onOutsideClick: PropTypes.func,
  renderDay: PropTypes.func,
  renderCalendarInfo: PropTypes.func,

  // accessibility
  onBlur: PropTypes.func,
  isFocused: PropTypes.bool,
  showKeyboardShortcuts: PropTypes.bool,

  // i18n
  monthFormat: PropTypes.string,
  phrases: PropTypes.shape(getPhrasePropTypes(DayPickerPhrases)),
});

const defaultProps = {
  startDate: undefined, // TODO: use null
  endDate: undefined, // TODO: use null
  onDatesChange() {},

  focusedInput: null,
  onFocusChange() {},
  onClose() {},

  keepOpenOnDateSelect: false,
  minimumNights: 1,
  isOutsideRange() {},
  isDayBlocked() {},
  isDayHighlighted() {},

  // DayPicker props
  enableOutsideDays: false,
  numberOfMonths: 1,
  orientation: HORIZONTAL_ORIENTATION,
  withPortal: false,

  initialVisibleMonth: DayPickerDefaultProps.initialVisibleMonth,
  daySize: DAY_SIZE,

  navPrev: null,
  navNext: null,

  onPrevMonthClick() {},
  onNextMonthClick() {},
  onOutsideClick() {},

  renderDay: null,
  renderCalendarInfo: null,

  // accessibility
  onBlur() {},
  isFocused: false,
  showKeyboardShortcuts: false,

  // i18n
  monthFormat: 'MMMM YYYY',
  phrases: DayPickerPhrases,
};

export default class DayPickerRangeController extends React.Component {
  constructor(props) {
    super(props);

    this.isTouchDevice = isTouchDevice();
    this.modifiers = {
      today: day => this.isToday(day),
      blocked: day => this.isBlocked(day),
      'blocked-calendar': day => props.isDayBlocked(day),
      'blocked-out-of-range': day => props.isOutsideRange(day),
      'highlighted-calendar': day => props.isDayHighlighted(day),
      valid: day => !this.isBlocked(day),
      'selected-start': day => this.isStartDate(day),
      'selected-end': day => this.isEndDate(day),
      'blocked-minimum-nights': day => this.doesNotMeetMinimumNights(day),
      'selected-span': day => this.isInSelectedSpan(day),
      'last-in-range': day => this.isLastInRange(day),
      hovered: day => this.isHovered(day),
      'hovered-span': day => this.isInHoveredSpan(day),
      'after-hovered-start': day => this.isDayAfterHoveredStartDate(day),
    };

    this.state = {
      hoverDate: null,
      visibleDays: this.getModifiers(props),
    };

    this.onDayClick = this.onDayClick.bind(this);
    this.onDayMouseEnter = this.onDayMouseEnter.bind(this);
    this.onDayMouseLeave = this.onDayMouseLeave.bind(this);
    this.getFirstFocusableDay = this.getFirstFocusableDay.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const { startDate, endDate, focusedInput } = nextProps;
    const { visibleDays } = this.state;

    const didStartDateChange = startDate !== this.props.startDate;
    const didEndDateChange = endDate !== this.props.endDate;

    let updatedDays = {};
    if (didStartDateChange) {
      updatedDays = {
        ...updatedDays,
        ...this.deleteModifier(this.props.startDate, 'selected-start'),
        ...this.addModifier(startDate, 'selected-start'),
      };

      // need to update minimum nights if end date is focused
    }

    if (didEndDateChange) {
      updatedDays = {
        ...updatedDays,
        ...this.deleteModifier(this.props.endDate, 'selected-end'),
        ...this.addModifier(endDate, 'selected-end'),
      };
    }

    if (startDate && endDate && (didStartDateChange || didEndDateChange)) {
      if (this.props.startDate && this.props.endDate) {
        const oldSpanStart = this.props.startDate.clone().add(1, 'day');
        const oldSpanEnd = this.props.endDate.clone().subtract(1, 'day');
        updatedDays = {
          ...updatedDays,
          ...this.deleteModifierFromRange(oldSpanStart, oldSpanEnd, 'selected-span'),
        };
      }

      // update the new span
      const spanStart = startDate.clone().add(1, 'day');
      const spanEnd = endDate.clone().subtract(1, 'day');
      updatedDays = {
        ...updatedDays,
        ...this.addModifierToRange(spanStart, spanEnd, 'selected-span'),
      };
    }

    if (focusedInput !== this.props.focusedInput) {
      // recalculate isDayBlocked
      // recalculate isDayHighlighted
      // ??? recalculate isOutsideRange
    }

    // has today changed?

    if (Object.keys(updatedDays).length > 0) {
      this.setState({
        visibleDays: {
          ...visibleDays,
          ...updatedDays,
        },
      });
    }
  }

  componentWillUpdate() {
    this.today = moment();
  }

  onDayClick(day, e) {
    const { keepOpenOnDateSelect, minimumNights, onBlur } = this.props;
    if (e) e.preventDefault();
    if (this.isBlocked(day)) return;

    const { focusedInput, onFocusChange, onClose } = this.props;
    let { startDate, endDate } = this.props;

    if (focusedInput === START_DATE) {
      onFocusChange(END_DATE);

      startDate = day;

      if (isInclusivelyAfterDay(day, endDate)) {
        endDate = null;
      }
    } else if (focusedInput === END_DATE) {
      const firstAllowedEndDate = startDate && startDate.clone().add(minimumNights, 'days');

      if (!startDate) {
        endDate = day;
        onFocusChange(START_DATE);
      } else if (isInclusivelyAfterDay(day, firstAllowedEndDate)) {
        endDate = day;
        if (!keepOpenOnDateSelect) {
          onFocusChange(null);
          onClose({ startDate, endDate });
        }
      } else {
        startDate = day;
        endDate = null;
      }
    }

    this.props.onDatesChange({ startDate, endDate });
    onBlur();
  }

  onDayMouseEnter(day) {
    if (this.isTouchDevice) return;
    const { startDate, endDate } = this.props;
    const { hoverDate, visibleDays } = this.state;

    let updatedDays = {
      ...this.addModifier(day, 'hovered'),
      ...this.deleteModifier(hoverDate, 'hovered'),
    };

    // clear previous span

    if (startDate && !endDate && day.isAfter(startDate, 'day')) {
      updatedDays = {
        ...updatedDays,
        ...this.addModifierToRange(startDate, day, 'hovered-span'),
      };
    }

    if (!startDate && endDate && day.isBefore(endDate, 'day')) {
      updatedDays = {
        ...updatedDays,
        ...this.addModifierToRange(day, endDate, 'hovered-span'),
      };
    }

    this.setState({
      hoverDate: day,
      visibleDays: {
        ...visibleDays,
        ...updatedDays,
      },
    });
  }

  onDayMouseLeave() {
    const { hoverDate, visibleDays } = this.state;
    if (this.isTouchDevice || !hoverDate) return;

    this.setState({
      hoverDate: null,
      visibleDays: {
        ...visibleDays,
        ...this.deleteModifier(hoverDate, 'hovered'),
      },
    });
  }

  getFirstFocusableDay(newMonth) {
    const { startDate, endDate, focusedInput, minimumNights, numberOfMonths } = this.props;

    let focusedDate = newMonth.clone().startOf('month');
    if (focusedInput === START_DATE && startDate) {
      focusedDate = startDate.clone();
    } else if (focusedInput === END_DATE && !endDate && startDate) {
      focusedDate = startDate.clone().add(minimumNights, 'days');
    } else if (focusedInput === END_DATE && endDate) {
      focusedDate = endDate.clone();
    }

    if (this.isBlocked(focusedDate)) {
      const days = [];
      const lastVisibleDay = newMonth.clone().add(numberOfMonths - 1, 'months').endOf('month');
      let currentDay = focusedDate.clone();
      while (!currentDay.isAfter(lastVisibleDay)) {
        currentDay = currentDay.clone().add(1, 'day');
        days.push(currentDay);
      }

      const viableDays = days.filter(day => !this.isBlocked(day) && day.isAfter(focusedDate));
      if (viableDays.length > 0) focusedDate = viableDays[0];
    }

    return focusedDate;
  }

  getModifiers(props) {
    const {
      numberOfMonths,
      enableOutsideDays,
      initialVisibleMonth,
    } = this.props || props;

    const currentMonth = initialVisibleMonth();
    const visibleDays = getVisibleDays(currentMonth, numberOfMonths, enableOutsideDays);

    const days = {};
    visibleDays.forEach((day) => {
      days[toISODateString(day)] = this.getModifiersForDay(day);
    });

    return days;
  }

  getModifiersForDay(day) {
    return new Set(Object.keys(this.modifiers).filter(modifier => this.modifiers[modifier](day)));
  }

  addModifier(day, modifier) {
    if (!day) return {};

    const { visibleDays } = this.state;
    const iso = toISODateString(day);
    if (visibleDays[iso].has(modifier)) return {};

    return { [iso]: new Set(visibleDays[iso]).add(modifier) };
  }

  addModifierToRange(start, end, modifier) {
    let updatedDays = {};

    let spanStart = start.clone();
    while (isInclusivelyBeforeDay(spanStart, end)) {
      updatedDays = {
        ...updatedDays,
        ...this.addModifier(spanStart, modifier),
      };
      spanStart = spanStart.clone().add(1, 'day');
    }

    return updatedDays;
  }

  deleteModifier(day, modifier) {
    if (!day) return {};

    const { visibleDays } = this.state;

    const iso = toISODateString(day);
    if (!visibleDays[iso].has(modifier)) return {};

    const modifiers = new Set(visibleDays[iso]);
    modifiers.delete(modifier);
    return { [iso]: modifiers };
  }

  deleteModifierFromRange(start, end, modifier) {
    let updatedDays = {};

    let spanStart = start.clone();
    while (isInclusivelyBeforeDay(spanStart, end)) {
      updatedDays = {
        ...updatedDays,
        ...this.deleteModifier(spanStart, modifier),
      };
      spanStart = spanStart.clone().add(1, 'day');
    }

    return updatedDays;
  }

  doesNotMeetMinimumNights(day) {
    const { startDate, isOutsideRange, focusedInput, minimumNights } = this.props;
    if (focusedInput !== END_DATE) return false;

    if (startDate) {
      const dayDiff = day.diff(startDate.clone().startOf('day').hour(12), 'days');
      return dayDiff < minimumNights && dayDiff >= 0;
    }
    return isOutsideRange(moment(day).subtract(minimumNights, 'days'));
  }

  isDayAfterHoveredStartDate(day) {
    const { startDate, endDate, minimumNights } = this.props;
    const { hoverDate } = this.state || {};
    return !!startDate && !endDate && !this.isBlocked(day) && isNextDay(hoverDate, day) &&
      minimumNights > 0 && isSameDay(hoverDate, startDate);
  }

  isEndDate(day) {
    return isSameDay(day, this.props.endDate);
  }

  isHovered(day) {
    const hoverDate = this.state || {};
    return isSameDay(day, hoverDate);
  }

  isInHoveredSpan(day) {
    const { startDate, endDate } = this.props;
    const { hoverDate } = this.state || {};

    const isForwardRange = !!startDate && !endDate &&
      (day.isBetween(startDate, hoverDate) ||
       isSameDay(hoverDate, day));
    const isBackwardRange = !!endDate && !startDate &&
      (day.isBetween(hoverDate, endDate) ||
       isSameDay(hoverDate, day));

    const isValidDayHovered = hoverDate && !this.isBlocked(hoverDate);

    return (isForwardRange || isBackwardRange) && isValidDayHovered;
  }

  isInSelectedSpan(day) {
    const { startDate, endDate } = this.props;
    return day.isBetween(startDate, endDate);
  }

  isLastInRange(day) {
    return this.isInSelectedSpan(day) && isNextDay(day, this.props.endDate);
  }

  isStartDate(day) {
    return isSameDay(day, this.props.startDate);
  }

  isBlocked(day) {
    const { isDayBlocked, isOutsideRange } = this.props;
    return isDayBlocked(day) || isOutsideRange(day) || this.doesNotMeetMinimumNights(day);
  }

  isToday(day) {
    return isSameDay(day, this.today);
  }

  render() {
    const {
      numberOfMonths,
      orientation,
      monthFormat,
      navPrev,
      navNext,
      onOutsideClick,
      onPrevMonthClick,
      onNextMonthClick,
      withPortal,
      enableOutsideDays,
      initialVisibleMonth,
      daySize,
      focusedInput,
      renderDay,
      renderCalendarInfo,
      onBlur,
      isFocused,
      showKeyboardShortcuts,
      phrases,
    } = this.props;

    const { visibleDays } = this.state;

    // set the appropriate CalendarDay phrase based on focusedInput
    let chooseAvailableDate = phrases.chooseAvailableDate;
    if (focusedInput === START_DATE) {
      chooseAvailableDate = phrases.chooseAvailableStartDate;
    } else if (focusedInput === END_DATE) {
      chooseAvailableDate = phrases.chooseAvailableEndDate;
    }

    const calendarDayPhrases = {
      ...phrases,
      chooseAvailableDate,
    };

    return (
      <DayPicker
        ref={(ref) => { this.dayPicker = ref; }}
        orientation={orientation}
        enableOutsideDays={enableOutsideDays}
        modifiers={visibleDays}
        numberOfMonths={numberOfMonths}
        onDayClick={this.onDayClick}
        onDayMouseEnter={this.onDayMouseEnter}
        onDayMouseLeave={this.onDayMouseLeave}
        onPrevMonthClick={onPrevMonthClick}
        onNextMonthClick={onNextMonthClick}
        monthFormat={monthFormat}
        withPortal={withPortal}
        hidden={!focusedInput}
        initialVisibleMonth={initialVisibleMonth}
        daySize={daySize}
        onOutsideClick={onOutsideClick}
        navPrev={navPrev}
        navNext={navNext}
        renderDay={renderDay}
        renderCalendarInfo={renderCalendarInfo}
        isFocused={isFocused}
        getFirstFocusableDay={this.getFirstFocusableDay}
        onBlur={onBlur}
        showKeyboardShortcuts={showKeyboardShortcuts}
        phrases={calendarDayPhrases}
      />
    );
  }
}

DayPickerRangeController.propTypes = propTypes;
DayPickerRangeController.defaultProps = defaultProps;

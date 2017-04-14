// TODO(maja): get this working for enableOutsideDays
export default function isDayVisible(day, month, numberOfMonths) {
  const firstDayOfFirstMonth = month.clone().startOf('month');
  const lastDayOfLastMonth = month.clone().add(numberOfMonths - 1, 'months').endOf('month');

  return !day.isBefore(firstDayOfFirstMonth) && !day.isAfter(lastDayOfLastMonth);
}

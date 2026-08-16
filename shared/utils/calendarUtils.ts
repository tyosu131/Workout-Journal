export const generateCalendarDates = (year: number, month: number) => {
  const datesArray = [];
  const date = new Date(year, month, 1);
  const startDay = date.getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  // Add empty slots from the previous month
  for (let i = 0; i < startDay; i++) {
      datesArray.push(null);
  }

  // Add dates from the current month
  for (let i = 1; i <= lastDate; i++) {
      datesArray.push({ date: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}` });
  }

  // Add empty slots at the end of the week to reach 42 cells
  while (datesArray.length % 7 !== 0) {
      datesArray.push(null);
  }

  // Add more empty slots until the calendar has 42 cells for six weeks
  while (datesArray.length < 42) {
      datesArray.push(null);
  }

  return datesArray;
};

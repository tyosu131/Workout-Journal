export const generateCalendarDates = (year: number, month: number) => {
    const datesArray = [];
    const date = new Date(year, month, 1);
    const startDay = date.getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
  
    for (let i = 0; i < startDay; i++) {
      datesArray.push(null);
    }
  
    for (let i = 1; i <= lastDate; i++) {
      datesArray.push({ date: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}` });
    }
  
    const remainingCells = 7 - (datesArray.length % 7);
    if (remainingCells < 7) {
      for (let i = 0; i < remainingCells; i++) {
        datesArray.push(null);
      }
    }
  
    return datesArray;
  };
  
  export const handlePrevMonth = (currentDate: Date, setCurrentDate: (date: Date) => void) => {
    const prevMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(prevMonthDate);
  };
  
  export const handleNextMonth = (currentDate: Date, setCurrentDate: (date: Date) => void) => {
    const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(nextMonthDate);
  };
  
import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  HStack,
  IconButton,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverFooter,
  PopoverHeader,
  PopoverTrigger,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@chakra-ui/icons";
import {
  isSameCalendarMonth,
  type CalendarMonth,
} from "../../../../shared/utils/calendarNavigation";

type PickerMode = "month" | "year";

type CalendarMonthPickerProps = {
  displayedMonth: CalendarMonth;
  currentMonth: CalendarMonth;
  onSelectMonth: (month: CalendarMonth) => void;
  onSelectCurrentMonth: () => void;
};

const MONTH_INDEXES = Array.from({ length: 12 }, (_, index) => index);
const MONTH_LABELS = [
  { short: "Jan", full: "January" },
  { short: "Feb", full: "February" },
  { short: "Mar", full: "March" },
  { short: "Apr", full: "April" },
  { short: "May", full: "May" },
  { short: "Jun", full: "June" },
  { short: "Jul", full: "July" },
  { short: "Aug", full: "August" },
  { short: "Sep", full: "September" },
  { short: "Oct", full: "October" },
  { short: "Nov", full: "November" },
  { short: "Dec", full: "December" },
] as const;
const YEARS_PER_PAGE = 12;
const YEAR_PAGE_ANCHOR = 2020;

const getYearPageStart = (year: number) => (
  YEAR_PAGE_ANCHOR
  + Math.floor((year - YEAR_PAGE_ANCHOR) / YEARS_PER_PAGE) * YEARS_PER_PAGE
);

export const CalendarMonthPicker: React.FC<CalendarMonthPickerProps> = ({
  displayedMonth,
  currentMonth,
  onSelectMonth,
  onSelectCurrentMonth,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<PickerMode>("month");
  const [browsedYear, setBrowsedYear] = useState(displayedMonth.year);
  const [yearPageStart, setYearPageStart] = useState(getYearPageStart(displayedMonth.year));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const monthFocusRef = useRef<HTMLButtonElement>(null);
  const yearFocusRef = useRef<HTMLButtonElement>(null);
  const didOpenRef = useRef(false);

  const yearRange = Array.from(
    { length: YEARS_PER_PAGE },
    (_, index) => yearPageStart + index
  );
  const initialMonthIndex = browsedYear === displayedMonth.year
    ? displayedMonth.monthIndex
    : 0;
  const initialYear = yearRange.includes(browsedYear) ? browsedYear : yearRange[0];
  const displayedMonthLabel = MONTH_LABELS[displayedMonth.monthIndex];

  useEffect(() => {
    if (!isOpen) {
      if (didOpenRef.current) {
        triggerRef.current?.focus();
        didOpenRef.current = false;
      }
      return;
    }

    didOpenRef.current = true;
    if (mode === "month") {
      monthFocusRef.current?.focus();
    } else {
      yearFocusRef.current?.focus();
    }
  }, [browsedYear, initialMonthIndex, initialYear, isOpen, mode, yearPageStart]);

  const handleOpen = () => {
    setBrowsedYear(displayedMonth.year);
    setYearPageStart(getYearPageStart(displayedMonth.year));
    setMode("month");
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleMonthSelect = (monthIndex: number) => {
    onSelectMonth({ year: browsedYear, monthIndex });
    handleClose();
  };

  const handleYearMode = () => {
    setYearPageStart(getYearPageStart(browsedYear));
    setMode("year");
  };

  const handleYearSelect = (year: number) => {
    setBrowsedYear(year);
    setMode("month");
  };

  const handleCurrentMonth = () => {
    onSelectCurrentMonth();
    handleClose();
  };

  return (
    <Popover
      isOpen={isOpen}
      onClose={handleClose}
      closeOnBlur
      closeOnEsc
      returnFocusOnClose
      placement="bottom"
      initialFocusRef={mode === "month" ? monthFocusRef : yearFocusRef}
    >
      <PopoverTrigger>
        <Button
          ref={triggerRef}
          variant="ghost"
          rightIcon={<ChevronDownIcon />}
          aria-label={`Select calendar month: ${displayedMonthLabel.full} ${displayedMonth.year}`}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          _focusVisible={{ boxShadow: "outline" }}
          onClick={handleOpen}
        >
          {displayedMonthLabel.short} {displayedMonth.year}
        </Button>
      </PopoverTrigger>

      <PopoverContent w="320px" onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          handleClose();
        }
      }}>
        {mode === "month" ? (
          <>
            <PopoverHeader>
              <HStack justify="space-between">
                <IconButton
                  aria-label="Previous year"
                  icon={<ChevronLeftIcon />}
                  variant="ghost"
                  onClick={() => setBrowsedYear((year) => year - 1)}
                />
                <Button
                  aria-label="Select year"
                  variant="ghost"
                  onClick={handleYearMode}
                  _focusVisible={{ boxShadow: "outline" }}
                >
                  {browsedYear}
                </Button>
                <IconButton
                  aria-label="Next year"
                  icon={<ChevronRightIcon />}
                  variant="ghost"
                  onClick={() => setBrowsedYear((year) => year + 1)}
                />
              </HStack>
            </PopoverHeader>
            <PopoverBody>
              <SimpleGrid columns={3} spacing={2} aria-label={`Select a month in ${browsedYear}`}>
                {MONTH_INDEXES.map((monthIndex) => {
                  const month = { year: browsedYear, monthIndex };
                  const monthLabel = MONTH_LABELS[monthIndex];
                  const isDisplayed = isSameCalendarMonth(month, displayedMonth);
                  const isCurrent = isSameCalendarMonth(month, currentMonth);
                  const isCurrentOnly = isCurrent && !isDisplayed;
                  const labelSuffix = isDisplayed
                    ? " (Displayed)"
                    : isCurrentOnly
                    ? " (Current month)"
                    : "";

                  return (
                    <Button
                      key={monthIndex}
                      ref={monthIndex === initialMonthIndex ? monthFocusRef : undefined}
                      variant={isDisplayed ? "solid" : "outline"}
                      colorScheme="blue"
                      aria-label={`${monthLabel.full} ${browsedYear}${labelSuffix}`}
                      aria-current={isDisplayed ? "date" : undefined}
                      aria-pressed={isDisplayed}
                      data-current-month={isCurrentOnly ? "true" : undefined}
                      borderWidth={isCurrentOnly ? "2px" : undefined}
                      borderColor={isCurrentOnly ? "blue.400" : undefined}
                      _hover={{ bg: isDisplayed ? "blue.600" : "blue.50" }}
                      _focusVisible={{ boxShadow: "outline" }}
                      onClick={() => handleMonthSelect(monthIndex)}
                    >
                      {monthLabel.short}
                    </Button>
                  );
                })}
              </SimpleGrid>
            </PopoverBody>
          </>
        ) : (
          <>
            <PopoverHeader>
              <HStack justify="space-between">
                <IconButton
                  aria-label="Previous 12 years"
                  icon={<ChevronLeftIcon />}
                  variant="ghost"
                  onClick={() => setYearPageStart((year) => year - YEARS_PER_PAGE)}
                />
                <Text aria-live="polite">
                  {yearPageStart}–{yearPageStart + YEARS_PER_PAGE - 1}
                </Text>
                <IconButton
                  aria-label="Next 12 years"
                  icon={<ChevronRightIcon />}
                  variant="ghost"
                  onClick={() => setYearPageStart((year) => year + YEARS_PER_PAGE)}
                />
              </HStack>
            </PopoverHeader>
            <PopoverBody>
              <SimpleGrid columns={3} spacing={2} aria-label="Select a year">
                {yearRange.map((year) => {
                  const isSelected = year === browsedYear;
                  const isCurrent = year === currentMonth.year;
                  const labelSuffix = isSelected && isCurrent
                    ? " (Selected, current year)"
                    : isSelected
                    ? " (Selected)"
                    : isCurrent
                    ? " (Current year)"
                    : "";

                  return (
                    <Button
                      key={year}
                      ref={year === initialYear ? yearFocusRef : undefined}
                      variant={isSelected ? "solid" : "outline"}
                      colorScheme="blue"
                      aria-label={`Select ${year}${labelSuffix}`}
                      aria-pressed={isSelected}
                      data-current-year={isCurrent ? "true" : undefined}
                      borderWidth={isCurrent ? "2px" : undefined}
                      borderColor={isCurrent ? "blue.400" : undefined}
                      _hover={{ bg: isSelected ? "blue.600" : "blue.50" }}
                      _focusVisible={{ boxShadow: "outline" }}
                      onClick={() => handleYearSelect(year)}
                    >
                      {year}
                    </Button>
                  );
                })}
              </SimpleGrid>
            </PopoverBody>
          </>
        )}
        <PopoverFooter>
          <Box display="flex" justifyContent="flex-end">
            <Button variant="outline" onClick={handleCurrentMonth} _focusVisible={{ boxShadow: "outline" }}>
              This Month
            </Button>
          </Box>
        </PopoverFooter>
      </PopoverContent>
    </Popover>
  );
};

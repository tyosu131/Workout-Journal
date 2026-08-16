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
          aria-label={`年月を選択: ${displayedMonth.year}年 ${displayedMonth.monthIndex + 1}月`}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          _focusVisible={{ boxShadow: "outline" }}
          onClick={handleOpen}
        >
          {displayedMonth.year}年 {displayedMonth.monthIndex + 1}月
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
                  aria-label="前年"
                  icon={<ChevronLeftIcon />}
                  variant="ghost"
                  onClick={() => setBrowsedYear((year) => year - 1)}
                />
                <Button
                  aria-label="年を選択"
                  variant="ghost"
                  onClick={handleYearMode}
                  _focusVisible={{ boxShadow: "outline" }}
                >
                  {browsedYear}年
                </Button>
                <IconButton
                  aria-label="翌年"
                  icon={<ChevronRightIcon />}
                  variant="ghost"
                  onClick={() => setBrowsedYear((year) => year + 1)}
                />
              </HStack>
            </PopoverHeader>
            <PopoverBody>
              <SimpleGrid columns={3} spacing={2} aria-label={`${browsedYear}年の月を選択`}>
                {MONTH_INDEXES.map((monthIndex) => {
                  const month = { year: browsedYear, monthIndex };
                  const isDisplayed = isSameCalendarMonth(month, displayedMonth);
                  const isCurrent = isSameCalendarMonth(month, currentMonth);
                  const isCurrentOnly = isCurrent && !isDisplayed;
                  const labelSuffix = isDisplayed
                    ? "（表示中）"
                    : isCurrentOnly
                    ? "（現在の月）"
                    : "";

                  return (
                    <Button
                      key={monthIndex}
                      ref={monthIndex === initialMonthIndex ? monthFocusRef : undefined}
                      variant={isDisplayed ? "solid" : "outline"}
                      colorScheme="blue"
                      aria-label={`${browsedYear}年 ${monthIndex + 1}月${labelSuffix}`}
                      aria-current={isDisplayed ? "date" : undefined}
                      aria-pressed={isDisplayed}
                      data-current-month={isCurrentOnly ? "true" : undefined}
                      borderWidth={isCurrentOnly ? "2px" : undefined}
                      borderColor={isCurrentOnly ? "blue.400" : undefined}
                      _hover={{ bg: isDisplayed ? "blue.600" : "blue.50" }}
                      _focusVisible={{ boxShadow: "outline" }}
                      onClick={() => handleMonthSelect(monthIndex)}
                    >
                      {monthIndex + 1}月
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
                  aria-label="前の12年"
                  icon={<ChevronLeftIcon />}
                  variant="ghost"
                  onClick={() => setYearPageStart((year) => year - YEARS_PER_PAGE)}
                />
                <Text aria-live="polite">
                  {yearPageStart}年 - {yearPageStart + YEARS_PER_PAGE - 1}年
                </Text>
                <IconButton
                  aria-label="次の12年"
                  icon={<ChevronRightIcon />}
                  variant="ghost"
                  onClick={() => setYearPageStart((year) => year + YEARS_PER_PAGE)}
                />
              </HStack>
            </PopoverHeader>
            <PopoverBody>
              <SimpleGrid columns={3} spacing={2} aria-label="年を選択">
                {yearRange.map((year) => {
                  const isSelected = year === browsedYear;
                  const isCurrent = year === currentMonth.year;
                  const labelSuffix = isSelected && isCurrent
                    ? "（選択中・現在年）"
                    : isSelected
                    ? "（選択中）"
                    : isCurrent
                    ? "（現在年）"
                    : "";

                  return (
                    <Button
                      key={year}
                      ref={year === initialYear ? yearFocusRef : undefined}
                      variant={isSelected ? "solid" : "outline"}
                      colorScheme="blue"
                      aria-label={`${year}年を選択${labelSuffix}`}
                      aria-pressed={isSelected}
                      data-current-year={isCurrent ? "true" : undefined}
                      borderWidth={isCurrent ? "2px" : undefined}
                      borderColor={isCurrent ? "blue.400" : undefined}
                      _hover={{ bg: isSelected ? "blue.600" : "blue.50" }}
                      _focusVisible={{ boxShadow: "outline" }}
                      onClick={() => handleYearSelect(year)}
                    >
                      {year}年
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
              今月
            </Button>
          </Box>
        </PopoverFooter>
      </PopoverContent>
    </Popover>
  );
};

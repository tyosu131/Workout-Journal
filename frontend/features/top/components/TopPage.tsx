// portfolio real\frontend\features\top\components\TopPage.tsx

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Box,
  Stack,
  Text,
  IconButton,
  Grid,
  GridItem,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tag,
  TagLabel,
} from "@chakra-ui/react";
import {
  HamburgerIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AddIcon,
} from "@chakra-ui/icons";
import { useRouter } from "next/router";
import { URLS } from "../../../../shared/constants/urls";
import { generateCalendarDates } from "../../../../shared/utils/calendarUtils";
import {
  createNoteQuery,
  formatCalendarMonth,
  formatLocalDate,
  getCalendarMonthRange,
  getCurrentCalendarMonth,
  isSameCalendarMonth,
  resolveCalendarMonth,
  shiftCalendarMonth,
  type CalendarMonth,
} from "../../../../shared/utils/calendarNavigation";
import { fetchNotesInRangeAPI } from "../../../features/notes/api";
import { useTagColor } from "../../../features/notes/contexts/TagColorContext";
import { CalendarMonthPicker } from "./CalendarMonthPicker";

const useCurrentLocalDate = () => {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );
    const timeoutId = setTimeout(
      () => setCurrentDate(new Date()),
      nextMidnight.getTime() - now.getTime()
    );

    return () => clearTimeout(timeoutId);
  }, [currentDate]);

  return currentDate;
};

const Top: React.FC = () => {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const currentDate = useCurrentLocalDate();

  // Manage each date's state (tags and hasContent)
  const [notesByDate, setNotesByDate] = useState<{
    [date: string]: { tags: string[]; hasContent: boolean };
  }>({});

  // Get getTagColor from global tag color management
  const { getTagColor } = useTagColor();

  // Check token
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      router.push("/login");
      return;
    }
    setToken(storedToken);
  }, [router]);

  // The URL query is the source of truth for the displayed month.
  const displayedMonth = useMemo(
    () => resolveCalendarMonth(router.isReady ? router.query.month : undefined, currentDate),
    [currentDate, router.isReady, router.query.month]
  );
  const { year, monthIndex } = displayedMonth;
  const month = monthIndex + 1;
  const { daysInMonth, startDate, endDate } = useMemo(
    () => getCalendarMonthRange(displayedMonth),
    [displayedMonth]
  );
  const currentMonth = getCurrentCalendarMonth(currentDate);
  const isCurrentMonth = isSameCalendarMonth(displayedMonth, currentMonth);

  useEffect(() => {
    async function fetchNotesForMonth() {
      // Start and end of the month
      try {
        // Fetch all notes in the month with one API call
        const notes = await fetchNotesInRangeAPI(startDate, endDate);

        // Create an object keyed by date
        const newNotesByDate: {
          [date: string]: { tags: string[]; hasContent: boolean };
        } = {};

        notes.forEach((note) => {
          newNotesByDate[note.date] = {
            tags: note.tags || [],
            hasContent: !!(note.note && note.note.trim().length > 0),
          };
        });

        // Initialize dates without notes to empty values
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          if (!newNotesByDate[dateStr]) {
            newNotesByDate[dateStr] = { tags: [], hasContent: false };
          }
        }

        setNotesByDate(newNotesByDate);
      } catch (error) {
        console.error("Error fetching notes for month:", error);
      }
    }

    fetchNotesForMonth();
  }, [year, month, daysInMonth, startDate, endDate]);

  // Generate the date array needed for the calendar
  const calendarDates = useMemo(
    () => generateCalendarDates(year, monthIndex),
    [year, monthIndex]
  );

  // Current date string
  const todayString = formatLocalDate(currentDate);

  // Weekday labels
  const daysOfWeek = useMemo(
    () => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    []
  );

  // Handle a specified date click
  const handleDateClick = (dateStr: string) => {
    router.push({
      pathname: `/note/${dateStr}`,
      query: createNoteQuery(router.query, displayedMonth),
    });
  };

  const updateDisplayedMonth = useCallback(
    (nextMonth: CalendarMonth, historyMode: "push" | "replace") => {
      router[historyMode](
        {
          pathname: URLS.TOP_PAGE,
          query: { ...router.query, month: formatCalendarMonth(nextMonth) },
        },
        undefined,
        { shallow: true }
      );
    },
    [router]
  );

  // Go to the previous month
  const handlePrevMonth = () => {
    updateDisplayedMonth(shiftCalendarMonth(displayedMonth, -1), "replace");
  };

  // Go to the next month
  const handleNextMonth = () => {
    updateDisplayedMonth(shiftCalendarMonth(displayedMonth, 1), "replace");
  };

  const handleToday = () => {
    updateDisplayedMonth(currentMonth, "replace");
  };

  const handleMonthSelection = (selectedMonth: CalendarMonth) => {
    updateDisplayedMonth(selectedMonth, "push");
  };

  return token ? (
    <Box>
      {/* Top-right menu */}
      <Box position="absolute" top="10px" right="10px">
        <Menu>
          <MenuButton
            as={IconButton}
            aria-label="Options"
            icon={<HamburgerIcon boxSize="1.5em" />}
            variant="outline"
            _hover={{ bg: "gray.200", cursor: "pointer" }}
            transition="all 0.2s"
            _active={{ transform: "scale(0.95)" }}
          />
          <MenuList>
            <MenuItem onClick={() => router.push(URLS.ANALYTICS_PAGE)}>
              <Box fontSize="lg" py={4}>
                Analytics
              </Box>
            </MenuItem>
            <MenuItem onClick={() => router.push(URLS.USER_PAGE)}>
              <Box fontSize="lg" py={4}>
                User
              </Box>
            </MenuItem>
            <MenuItem onClick={() => router.push(URLS.CONTACT_PAGE)}>
              <Box fontSize="lg" py={4}>
                Contact
              </Box>
            </MenuItem>
            <MenuItem onClick={() => router.push("/tag-management")}>
              <Box fontSize="lg" py={4}>
                Tag Management
              </Box>
            </MenuItem>
            <MenuItem
              onClick={() => {
                localStorage.removeItem("token");
                router.push("/login");
              }}
            >
              <Box fontSize="lg" py={4}>
                Log Out
              </Box>
            </MenuItem>
          </MenuList>
        </Menu>
      </Box>

      {/* Title section */}
      <Box mt={4} textAlign="center">
        <Stack direction="column" align="center" justify="center" mb={6} spacing={4}>
          <Stack direction="row" align="center" justify="center">
            {/* Previous month */}
            <IconButton
              icon={<ChevronLeftIcon />}
              aria-label="Previous Month"
              onClick={handlePrevMonth}
              _hover={{ bg: "gray.200", cursor: "pointer" }}
              transition="all 0.2s"
              _active={{ transform: "scale(0.95)" }}
            />
            <CalendarMonthPicker
              displayedMonth={displayedMonth}
              currentMonth={currentMonth}
              onSelectMonth={handleMonthSelection}
              onSelectCurrentMonth={handleToday}
            />
            {/* Next month */}
            <IconButton
              icon={<ChevronRightIcon />}
              aria-label="Next Month"
              onClick={handleNextMonth}
              _hover={{ bg: "gray.200", cursor: "pointer" }}
              transition="all 0.2s"
              _active={{ transform: "scale(0.95)" }}
            />
          </Stack>

          <Stack direction={{ base: "column", sm: "row" }} align="center" spacing={3}>
            <Button onClick={handleToday} isDisabled={isCurrentMonth}>
              今月
            </Button>
          </Stack>

          {/* Create button */}
          <Button
            onClick={() => {
              const todayStr = formatLocalDate(new Date());
              if (notesByDate[todayStr]?.hasContent) {
                handleDateClick(todayStr);
              } else {
                router.push({
                  pathname: "/note/new",
                  query: { ...createNoteQuery(router.query, displayedMonth), date: todayStr },
                });
              }
            }}
            width="200px"
            mt={4}
            mb={8}
            _hover={{ bg: "gray.200", cursor: "pointer", transform: "scale(1.02)" }}
            transition="all 0.2s"
            leftIcon={<AddIcon />}
          >
            作成
          </Button>
        </Stack>
      </Box>

      {/* Calendar display */}
      <Box mt={4} textAlign="center" w="100%">
        <Grid templateColumns="repeat(7, 1fr)" gap={0} border="1px solid" borderColor="gray.200">
          {/* Weekday header */}
          {daysOfWeek.map((day, index) => (
            <GridItem
              key={day}
              textAlign="center"
              border="1px solid"
              borderBottom="none"
              borderColor="gray.200"
              p={2}
              color={index === 0 ? "red.500" : index === 6 ? "blue.500" : "black"}
            >
              <Text fontSize="lg" fontWeight="bold">
                {day}
              </Text>
            </GridItem>
          ))}

          {/* Date cells */}
          {calendarDates.map((dateObj, index) => (
            <GridItem
              key={index}
              textAlign="center"
              border="1px solid"
              borderColor="gray.200"
              p={2}
              h="100px"
              bg={dateObj?.date === todayString ? "yellow.200" : "white"}
              transition="all 0.2s"
              _hover={{ bg: "gray.100", cursor: "pointer", transform: "scale(1.02)" }}
            >
              {dateObj ? (
                <Button
                  onClick={() => handleDateClick(dateObj.date)}
                  variant="ghost"
                  h="100%"
                  w="100%"
                  position="relative"
                  transition="all 0.2s"
                  _hover={{
                    bg: "gray.200",
                    cursor: "pointer",
                    transform: "scale(1.02)",
                  }}
                >
                  <Text
                    position="absolute"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    color={
                      new Date(dateObj.date).getDay() === 0
                        ? "red.500"
                        : new Date(dateObj.date).getDay() === 6
                        ? "blue.500"
                        : "black"
                    }
                  >
                    {new Date(dateObj.date).getDate()}
                  </Text>
                  {/* Tags for the current date */}
                  {notesByDate[dateObj.date] && notesByDate[dateObj.date].tags.length > 0 && (
                    <Box
                      position="absolute"
                      bottom="4px"
                      left="50%"
                      transform="translateX(-50%)"
                      display="flex"
                      gap="4px"
                      flexWrap="wrap"
                    >
                      {notesByDate[dateObj.date].tags.map((tag, idx) => {
                        const colorScheme = getTagColor(tag);
                        return (
                          <Tag key={idx} size="sm" colorScheme={colorScheme}>
                            <TagLabel>{tag}</TagLabel>
                          </Tag>
                        );
                      })}
                    </Box>
                  )}
                </Button>
              ) : (
                <Box h="100%" w="100%"></Box>
              )}
            </GridItem>
          ))}
        </Grid>
      </Box>
    </Box>
  ) : null;
};

export default Top;

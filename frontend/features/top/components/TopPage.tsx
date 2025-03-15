import React, { useState, useMemo, useEffect } from "react";
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
  Input,
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
import { fetchNotesAPI } from "../../../features/notes/api";
// ★ グローバルなタグ色管理フックをインポート
import { useTagColor } from "../../../features/notes/contexts/TagColorContext";

const Top: React.FC = () => {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [token, setToken] = useState<string | null>(null);
  const [notesByDate, setNotesByDate] = useState<{
    [date: string]: { tags: string[]; hasContent: boolean };
  }>({});

  // グローバルなタグ色管理から getTagColor を取得
  const { getTagColor } = useTagColor();

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      router.push("/login");
      return;
    }
    setToken(storedToken);
  }, [router]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  useEffect(() => {
    async function fetchNotesForMonth() {
      const newNotesByDate: { [date: string]: { tags: string[]; hasContent: boolean } } = {};
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${month.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
        try {
          const notes = await fetchNotesAPI(dateStr);
          if (notes && notes.length > 0) {
            newNotesByDate[dateStr] = {
              tags: notes[0].tags || [],
              hasContent: !!(notes[0].note && notes[0].note.trim().length > 0),
            };
          } else {
            newNotesByDate[dateStr] = { tags: [], hasContent: false };
          }
        } catch (error) {
          console.error("Error fetching note for date", dateStr, error);
          newNotesByDate[dateStr] = { tags: [], hasContent: false };
        }
      }
      setNotesByDate(newNotesByDate);
    }
    fetchNotesForMonth();
  }, [year, month, daysInMonth]);

  const handleDateClick = (dateStr: string) => {
    router.push(`/note/${dateStr}`);
  };

  const handlePrevMonth = () => {
    const prevMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(prevMonthDate);
  };

  const handleNextMonth = () => {
    const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(nextMonthDate);
  };

  const calendarDates = useMemo(
    () => generateCalendarDates(year, currentDate.getMonth()),
    [year, currentDate]
  );
  const todayString = useMemo(() => new Date().toISOString().split("T")[0], []);
  const daysOfWeek = useMemo(() => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], []);

  return token ? (
    <Box>
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

      <Box mt={4} textAlign="center">
        <Stack direction="column" align="center" justify="center" mb={6} spacing={4}>
          <Stack direction="row" align="center" justify="center">
            <IconButton
              icon={<ChevronLeftIcon />}
              aria-label="Previous Month"
              onClick={handlePrevMonth}
              _hover={{ bg: "gray.200", cursor: "pointer" }}
              transition="all 0.2s"
              _active={{ transform: "scale(0.95)" }}
            />
            <Text fontSize="2xl" mx={2}>
              {year}年 {month}月
            </Text>
            <IconButton
              icon={<ChevronRightIcon />}
              aria-label="Next Month"
              onClick={handleNextMonth}
              _hover={{ bg: "gray.200", cursor: "pointer" }}
              transition="all 0.2s"
              _active={{ transform: "scale(0.95)" }}
            />
          </Stack>
          <Button
            onClick={() => {
              const todayStr = new Date().toISOString().split("T")[0];
              if (notesByDate[todayStr]?.hasContent) {
                router.push(`/note/${todayStr}`);
              } else {
                router.push(URLS.NOTE_NEW(todayStr));
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

      <Box mt={4} textAlign="center" w="100%">
        <Grid templateColumns="repeat(7, 1fr)" gap={0} border="1px solid" borderColor="gray.200">
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
                  {notesByDate[dateObj.date] &&
                    notesByDate[dateObj.date].tags.length > 0 && (
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

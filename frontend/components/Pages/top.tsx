import React, { useState } from "react";
import { Box, Stack, Text, IconButton, Grid, GridItem, Button, Menu, MenuButton, MenuList, MenuItem, Link as ChakraLink } from "@chakra-ui/react";
import { HamburgerIcon, ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { useRouter } from 'next/router';

const TOP: React.FC = () => {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());

  const handleDateClick = (date: string) => {
    router.push(`/note/new/${date}`);
  };

  const generateCalendarDates = (year: number, month: number) => {
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

  const handlePrevMonth = () => {
    const prevMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    setCurrentDate(prevMonthDate);
  };

  const handleNextMonth = () => {
    const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    setCurrentDate(nextMonthDate);
  };

  const calendarDates = generateCalendarDates(currentDate.getFullYear(), currentDate.getMonth());

  const todayString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD形式で今日の日付を取得

  return (
    <Box>
      <Box position="absolute" top="10px" right="10px">
        <Menu>
          <MenuButton 
            as={IconButton} 
            aria-label="Options" 
            icon={<HamburgerIcon boxSize="1.5em" />} 
            variant="outline" 
            _hover={{ bg: "gray.200", cursor: "pointer" }} 
          />
          <MenuList>
            <MenuItem 
              onClick={() => router.push("/user")} 
              _hover={{ bg: "gray.100", cursor: "pointer" }}
            >
              <Box fontSize="lg" py={4}>
                User
              </Box>
            </MenuItem>
            <MenuItem 
              onClick={() => router.push("/contact")} 
              _hover={{ bg: "gray.100", cursor: "pointer" }}
            >
              <Box fontSize="lg" py={4}>
                Contact
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
            />
            <Text fontSize="2xl" mx={2}>{currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月</Text>
            <IconButton 
              icon={<ChevronRightIcon />} 
              aria-label="Next Month" 
              onClick={handleNextMonth} 
              _hover={{ bg: "gray.200", cursor: "pointer" }} 
            />
          </Stack>
          <Button 
            onClick={() => router.push("/note/new")} 
            width="200px" 
            mt={4} 
            mb={8} 
            _hover={{ bg: "gray.200", cursor: "pointer" }}
          >
            作成
          </Button>
        </Stack>
      </Box>

      <Box mt={4} textAlign="center" w="100%">
        <Grid templateColumns="repeat(7, 1fr)" gap={0} border="1px solid" borderColor="gray.200">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
            <GridItem 
              key={day} 
              textAlign="center" 
              border="1px solid" 
              borderBottom="none" 
              borderColor="gray.200" 
              p={2} 
              color={index === 0 ? "red.500" : index === 6 ? "blue.500" : "black"}
            >
              <Text fontSize="lg" fontWeight="bold">{day}</Text>
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
              _hover={{ bg: "gray.100", cursor: "pointer" }}
            >
              {dateObj ? (
                <Button 
                  onClick={() => handleDateClick(dateObj.date)} 
                  variant="ghost" 
                  h="100%" 
                  w="100%" 
                  _hover={{ bg: "gray.200", cursor: "pointer" }}
                >
                  <Text 
                    color={new Date(dateObj.date).getDay() === 0 ? "red.500" : new Date(dateObj.date).getDay() === 6 ? "blue.500" : "black"}
                  >
                    {new Date(dateObj.date).getDate()}
                  </Text>
                </Button>
              ) : (
                <Box h="100%" w="100%"></Box>
              )}
            </GridItem>
          ))}
        </Grid>
      </Box>

      <Box mt={8} display="flex" justifyContent="center">
        <ChakraLink href="/" ml={4} _hover={{ cursor: "pointer", color: "blue.500", bg: "gray.100" }}>Top</ChakraLink>
        <ChakraLink href="/timer" ml={4} _hover={{ cursor: "pointer", color: "blue.500", bg: "gray.100" }}>Timer</ChakraLink>
      </Box>
    </Box>
  );
};

export default TOP;

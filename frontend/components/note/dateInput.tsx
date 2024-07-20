import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Box, FormLabel, Input } from "@chakra-ui/react";

interface DateInputProps {
  selectedDate: Date | null;
  onDateChange: (date: Date | null) => void;
}

const DateInput: React.FC<DateInputProps> = ({ selectedDate, onDateChange }) => {
  return (
    <Box>
      <FormLabel>Date:</FormLabel>
      <DatePicker
        selected={selectedDate}
        onChange={onDateChange}
        dateFormat="yyyy/MM/dd"
        customInput={<Input width="200px" />}
      />
    </Box>
  );
};

export default DateInput;

import React from 'react';
import { Box, Input } from '@chakra-ui/react';

interface DateInputProps {
  date: string;
  onDateChange: (newDate: string) => void;
}

const DateInput: React.FC<DateInputProps> = ({ date, onDateChange }) => (
  <Box mb={4}>
    <label htmlFor="date">Date:</label>
    <Input
      type="date"
      id="date"
      name="date"
      ml={2}
      defaultValue={date}
      onChange={(e) => onDateChange(e.target.value)}
    />
  </Box>
);

DateInput.displayName = 'DateInput';
export default DateInput;

import React from 'react';
import { Box, Input } from '@chakra-ui/react';

interface DateInputProps {
  date: string;
}

const DateInput: React.FC<DateInputProps> = ({ date }) => (
  <Box mb={4}>
    <label htmlFor="date">Date:</label>
    <Input type="date" id="date" name="date" ml={2} defaultValue={date} />
  </Box>
);

DateInput.displayName = 'DateInput';
export default DateInput;

import React from 'react';
import { Box, Input } from '@chakra-ui/react';

interface NoteInputProps {
  note: string;
  onNoteChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const NoteInput: React.FC<NoteInputProps> = ({ note, onNoteChange }) => (
  <Box mb={4}>
    <label htmlFor="note">Note:</label>
    <Input type="text" id="note" name="note" ml={2} value={note} onChange={onNoteChange} />
  </Box>
);

NoteInput.displayName = 'NoteInput';
export default NoteInput;

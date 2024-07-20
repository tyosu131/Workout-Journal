import React from "react";
import { Box, FormLabel, Input } from "@chakra-ui/react";

interface NoteInputProps {
  note: string;
  onNoteChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const NoteInput: React.FC<NoteInputProps> = ({ note, onNoteChange }) => {
  return (
    <Box>
      <FormLabel>Note:</FormLabel>
      <Input
        type="text"
        value={note}
        onChange={onNoteChange}
        size="md"
        width="200px"
      />
    </Box>
  );
};

export default NoteInput;

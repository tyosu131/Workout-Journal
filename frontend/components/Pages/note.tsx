import React, { useEffect, useState, useCallback } from 'react';
import { Box, Table, Button, Text } from '@chakra-ui/react';
import axios from 'axios';
import Header from '../note/header';
import DateInput from '../note/dateInput';
import NoteInput from '../note/noteInput';
import TableHeader from '../note/tableheader';
import TableBody from '../note/tablebody';
import { useDebouncedCallback } from 'use-debounce';

interface Set {
  weight: string;
  reps: string;
  rest: string;
}

interface Exercise {
  exercise: string;
  sets: Set[];
}

interface NoteData {
  date: string;
  note: string;
  exercises: Exercise[];
}

interface NoteProps {
  date: string;
}

const Note: React.FC<NoteProps> = ({ date }) => {
  const [noteData, setNoteData] = useState<NoteData>({
    date: date,
    note: '',
    exercises: Array.from({ length: 30 }).map(() => ({
      exercise: '',
      sets: Array.from({ length: 5 }).map(() => ({ weight: '', reps: '', rest: '' })),
    })),
  });

  useEffect(() => {
    const fetchNote = async () => {
      try {
        console.log(`Fetching note for date: ${date}`);
        const response = await axios.get(`http://localhost:3001/api/notes/${date}`);
        console.log('Fetched note:', response.data);
        if (response.data) {
          const parsedData = {
            ...response.data,
            exercises: JSON.parse(response.data.exercises)
          };
          setNoteData(parsedData);
        }
      } catch (error) {
        console.error('Failed to fetch note', error);
      }
    };

    fetchNote();
  }, [date]);

  const debouncedSave = useDebouncedCallback(async (data) => {
    try {
      console.log('Auto-saving note data:', data);
      await axios.post(`http://localhost:3001/api/notes/${data.date}`, data);
      console.log('Saved successfully!');
    } catch (error) {
      console.error('Failed to save note', error);
    }
  }, 1000);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, exerciseIndex: number, setIndex: number, field: keyof Set) => {
    const newExercises = [...noteData.exercises];
    newExercises[exerciseIndex].sets[setIndex][field] = e.target.value;
    const newData = { ...noteData, exercises: newExercises };
    setNoteData(newData);
    debouncedSave(newData);
  }, [noteData, debouncedSave]);

  const handleNoteChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newData = { ...noteData, note: e.target.value };
    setNoteData(newData);
    debouncedSave(newData);
  }, [noteData, debouncedSave]);

  const handleExerciseChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newExercises = [...noteData.exercises];
    newExercises[index].exercise = e.target.value;
    const newData = { ...noteData, exercises: newExercises };
    setNoteData(newData);
    debouncedSave(newData);
  }, [noteData, debouncedSave]);

  return (
    <Box p={4}>
      <Header />
      <Text fontSize="2xl" mb={4} textAlign="center">Note</Text>
      <DateInput date={noteData.date} />
      <NoteInput note={noteData.note} onNoteChange={handleNoteChange} />
      <Table variant="simple" size="sm">
        <TableHeader />
        <TableBody 
          exercises={noteData.exercises} 
          onExerciseChange={handleExerciseChange} 
          onInputChange={handleInputChange} 
        />
      </Table>
    </Box>
  );
};

Note.displayName = 'Note';
export default Note;

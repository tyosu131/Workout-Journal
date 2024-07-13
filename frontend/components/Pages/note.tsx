import React, { useEffect, useState, useCallback } from 'react';
import { Box, Table, Text } from '@chakra-ui/react';
import axios from 'axios';
import useSWR from 'swr';
import { useDebouncedCallback } from 'use-debounce';
import { useRouter } from 'next/router';
import Header from '../note/header';
import DateInput from '../note/dateInput';
import NoteInput from '../note/noteInput';
import TableHeader from '../note/tableheader';
import TableBody from '../note/tablebody';

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

const fetcher = async (url: string) => {
  try {
    const response = await axios.get(url);
    const data = response.data;
    return {
      ...data,
      exercises: JSON.parse(data.exercises)
    };
  } catch (error) {
    console.error('Failed to fetch:', error);
    throw error;
  }
};

const Note: React.FC<NoteProps> = ({ date }) => {
  const { data, error } = useSWR(
    date ? `${process.env.NEXT_PUBLIC_API_URL}/api/notes/${date}` : null,
    fetcher
  );

  const [noteData, setNoteData] = useState<NoteData>({
    date: '',
    note: '',
    exercises: Array.from({ length: 30 }).map(() => ({
      exercise: '',
      sets: Array.from({ length: 5 }).map(() => ({ weight: '', reps: '', rest: '' })),
    })),
  });

  useEffect(() => {
    if (data) {
      setNoteData(data);
    }
  }, [data]);

  const debouncedSave = useDebouncedCallback(async (data) => {
    try {
      console.log('Auto-saving note data:', data);
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/notes/${data.date}`, data);
      console.log('Saved successfully!');
    } catch (error) {
      console.error('Failed to save note', error);
    }
  }, 1000);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, exerciseIndex: number, setIndex: number, field: keyof Set) => {
      const newExercises = [...noteData.exercises];
      newExercises[exerciseIndex].sets[setIndex][field] = e.target.value;
      const newData = { ...noteData, exercises: newExercises };
      setNoteData(newData);
      debouncedSave(newData);
    },
    [noteData, debouncedSave]
  );

  const handleNoteChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newData = { ...noteData, note: e.target.value };
      setNoteData(newData);
      debouncedSave(newData);
    },
    [noteData, debouncedSave]
  );

  const handleExerciseChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
      const newExercises = [...noteData.exercises];
      newExercises[index].exercise = e.target.value;
      const newData = { ...noteData, exercises: newExercises };
      setNoteData(newData);
      debouncedSave(newData);
    },
    [noteData, debouncedSave]
  );

  if (error) return <div>Failed to load</div>;
  if (!data) return <div>Loading...</div>;

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

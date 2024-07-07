import React, { useEffect, useState, useCallback } from 'react';
import { Box, Table, Button, Text } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import axios from 'axios';
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

const Note: React.FC<{ date: string }> = ({ date }) => {
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
        const response = await axios.get(`/api/notes/${date}`);
        if (response.data) {
          console.log('Fetched note data:', response.data);
          setNoteData(response.data);
        } else {
          console.log('No note found for date:', date);
        }
      } catch (error) {
        console.error('Failed to fetch note', error);
      }
    };

    fetchNote();
  }, [date]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, exerciseIndex: number, setIndex: number, field: keyof Set) => {
    const newExercises = [...noteData.exercises];
    newExercises[exerciseIndex].sets[setIndex][field] = e.target.value;
    setNoteData({ ...noteData, exercises: newExercises });
  }, [noteData]);

  const handleNoteChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNoteData({ ...noteData, note: e.target.value });
  }, [noteData]);

  const handleExerciseChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newExercises = [...noteData.exercises];
    newExercises[index].exercise = e.target.value;
    setNoteData({ ...noteData, exercises: newExercises });
  }, [noteData]);

  const handleSave = useCallback(async () => {
    try {
      console.log('Saving note data:', noteData);
      await axios.post(`/api/notes/${noteData.date}`, noteData);
      console.log('Saved successfully');
      alert('Saved successfully!');
    } catch (error) {
      console.error('Failed to save note', error);
      alert('Failed to save note');
    }
  }, [noteData]);

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
      <Button mt={4} colorScheme="teal" onClick={handleSave}>Save</Button>
    </Box>
  );
};

Note.displayName = 'Note';
export default Note;
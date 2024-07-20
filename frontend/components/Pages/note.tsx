import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { Box, Table, Text, Spinner, Center } from "@chakra-ui/react";
import axios from "axios";
import useSWR from "swr";
import { useDebouncedCallback } from "use-debounce";
import Header from "../note/header";
import DateInput from "../note/dateInput";
import NoteInput from "../note/noteInput";
import TableHeader from "../note/tableheader";
import TableBody from "../note/tablebody";

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

const fetcher = (url: string) => axios.get(url).then((res) => res.data);

const Note: React.FC = () => {
  const router = useRouter();
  const { date } = router.query;
  const { data, error } = useSWR(date ? `${process.env.NEXT_PUBLIC_API_URL}/api/notes/${date}` : null, fetcher);
  const [noteData, setNoteData] = useState<NoteData>({
    date: "",
    note: "",
    exercises: Array.from({ length: 30 }).map(() => ({
      exercise: "",
      sets: Array.from({ length: 5 }).map(() => ({
        weight: "",
        reps: "",
        rest: "",
      })),
    })),
  });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (data) {
      try {
        console.log('Fetched data:', data); // デバッグ用のログ
        const parsedData = {
          ...data,
          exercises: JSON.parse(data.exercises),
        };
        setNoteData(parsedData);
      } catch (error) {
        console.error("Failed to parse exercises data:", error);
      }
    }
  }, [data]);

  const debouncedSave = useDebouncedCallback(async (data) => {
    try {
      console.log("Auto-saving note data:", data);
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/notes/${data.date}`, data);
      console.log("Saved successfully!");
    } catch (error) {
      console.error("Failed to save note", error);
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

  if (error) {
    console.error('Failed to load data:', error);
    return <div>Failed to load</div>;
  }
  
  if (!data) {
    console.log('Data is still loading...');
    return (
      <Center height="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (!isClient) return null;

  const selectedDate = new Date(noteData.date);
  const isValidDate = !isNaN(selectedDate.getTime());

  return (
    <Box p={4}>
      <Header />
      <Text fontSize="2xl" mb={4} textAlign="center">
        Note
      </Text>
      {isValidDate ? (
        <DateInput selectedDate={selectedDate} onDateChange={() => {}} />
      ) : (
        <div>Invalid Date</div>
      )}
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

Note.displayName = "Note";
export default Note;

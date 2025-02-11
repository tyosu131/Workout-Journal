import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Box, Table, Text, Spinner, Center, Button } from "@chakra-ui/react";
import useSWR from "swr";
import Header from "./header";
import DateInput from "./date-input";
import NoteInput from "./note-input";
import TableHeader from "./table-header";
import TableBody from "./table-body";
import useNoteHandlers from "../hooks/useNoteHandlers";
import { NoteData } from "../../../types/types";
import { apiRequestWithAuth } from "../../../../shared/utils/apiClient";

// ノートデータをAPIから取得
const fetchNoteData = async (url: string): Promise<NoteData[]> => {
  try {
    const response = await apiRequestWithAuth<{ notes: NoteData[] }>(url, "get");
    return response.notes || [];
  } catch (error) {
    console.error("Failed to fetch note data:", error);
    throw error;
  }
};

const Note: React.FC = () => {
  const router = useRouter();
  const { date } = router.query;
  const [noteData, setNoteData] = useState<NoteData | null>(null);

  // SWRによるデータ取得
  const { data, error, mutate } = useSWR<NoteData[]>(
    date ? `${process.env.NEXT_PUBLIC_API_URL}/api/notes/${date}` : null,
    fetchNoteData,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const { handleInputChange, handleNoteChange, handleExerciseChange, handleDateChange } =
    useNoteHandlers(noteData, setNoteData);

  // データ取得後にnoteDataをセット
  useEffect(() => {
    if (data && data.length > 0) {
      setNoteData(data[0]); // 取得したデータをセット
    } else if (date) {
      // 空データの初期化
      setNoteData({
        date: date as string,
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
    }
  }, [data, date]);

  if (!noteData) {
    return (
      <Center height="100vh">
        <Spinner size="xl" />
        <Text>Loading...</Text>
      </Center>
    );
  }

  return (
    <Box p={4}>
      <Header />
      <Text fontSize="2xl" mb={4} textAlign="center">
        Note
      </Text>
      <DateInput date={noteData.date} onDateChange={handleDateChange} />
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

export default Note;

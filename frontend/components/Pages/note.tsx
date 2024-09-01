import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Box, Table, Text, Spinner, Center } from "@chakra-ui/react";
import useSWR from "swr";
import Header from "../note/header";
import DateInput from "../note/dateInput";
import NoteInput from "../note/noteInput";
import TableHeader from "../note/tableheader";
import TableBody from "../note/tablebody";
import useNoteHandlers from "../../hooks/useNoteHandlers";
import { NoteData } from "../../types/types";
import axios from "axios";

// ノートデータをAPIから取得
const fetchNoteData = async (url: string): Promise<NoteData> => {
  const token = localStorage.getItem("token");
  const res = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (res.data.length === 0) {
    return {
      date: url.split('/').pop() as string,
      note: "",
      exercises: Array.from({ length: 30 }).map(() => ({
        exercise: "",
        sets: Array.from({ length: 5 }).map(() => ({
          weight: "",
          reps: "",
          rest: "",
        })),
      })),
    };
  }
  
  const data = res.data[0]; // データの最初の要素を取得
  const exercises = JSON.parse(data.exercises);

  return {
    ...data,
    exercises: Array.isArray(exercises) && exercises.length > 0 ? exercises : Array.from({ length: 30 }).map(() => ({
      exercise: "",
      sets: Array.from({ length: 5 }).map(() => ({
        weight: "",
        reps: "",
        rest: "",
      })),
    })),
  };
};

const Note: React.FC = () => {
  const router = useRouter();
  const { date } = router.query;
  const [noteData, setNoteData] = useState<NoteData | null>(null);

  const { data, error } = useSWR(
    date ? `${process.env.NEXT_PUBLIC_API_URL}/api/notes/${date}` : null,
    fetchNoteData,
    { revalidateOnFocus: false, shouldRetryOnError: false } // 再フェッチ制御
  );

  // データ取得が成功した場合のノートデータの設定、または見つからなかった場合の初期化
  useEffect(() => {
    if (data) {
      setNoteData(data);
    } else if (error) {
      console.error("Failed to fetch note:", error);
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
  }, [data, error, date]);

  // ノート変更を処理するカスタムフック
  const { handleInputChange, handleNoteChange, handleExerciseChange, handleDateChange } = useNoteHandlers(noteData, setNoteData);

  // データ取得中にスピナーを表示
  if (!data && !error && !noteData) {
    return (
      <Center height="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  // dateが取得される前にnoteDataを使用しないようにする
  if (!date || !noteData) {
    return (
      <Center height="100vh">
        <Spinner size="xl" />
        <Text>Loading...</Text>
      </Center>
    );
  }

  // 選択された日付が有効か確認
  const selectedDate = new Date(noteData.date);
  const isValidDate = !isNaN(selectedDate.getTime());

  // コンポーネントのレンダリング
  return (
    <Box p={4}>
      <Header />
      <Text fontSize="2xl" mb={4} textAlign="center">
        Note
      </Text>
      {isValidDate ? (
        <DateInput date={noteData.date} onDateChange={handleDateChange} />
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

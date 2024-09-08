// frontend/hooks/useNoteHandlers.ts
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { NoteData, Set } from "../types/types";
import axios from "axios";
import { getToken } from "../utils/tokenUtils"; // トークン取得関数をインポート

interface User {
  id: number;
  email: string;
}

const useNoteHandlers = (
  noteData: NoteData | null,
  setNoteData: React.Dispatch<React.SetStateAction<NoteData | null>>
) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  }, []);

  const saveNote = useCallback(async (data: NoteData) => {
    try {
      if (user) {
        const token = getToken(); // トークンを取得
        if (token) {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/notes/${data.date}`,
            data,
            {
              headers: {
                Authorization: `Bearer ${token}`, // 取得したトークンを使用
              },
            }
          );
          console.log("Saved response:", response.data);
        }
      }
    } catch (error) {
      console.error("Failed to save note", error);
    }
  }, [user]);

  const handleInputChange = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement>,
      exerciseIndex: number,
      setIndex: number,
      field: keyof Set
    ) => {
      if (!noteData) return;
      const newExercises = [...noteData.exercises];
      newExercises[exerciseIndex].sets[setIndex][field] = e.target.value;
      const newData = { ...noteData, exercises: newExercises };
      setNoteData(newData);
      saveNote(newData); // 即時保存
    },
    [noteData, saveNote, setNoteData]
  );

  const handleNoteChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!noteData) return;
      const newData = { ...noteData, note: e.target.value };
      setNoteData(newData);
      saveNote(newData); // 即時保存
    },
    [noteData, saveNote, setNoteData]
  );

  const handleExerciseChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
      if (!noteData) return;
      const newExercises = [...noteData.exercises];
      newExercises[index].exercise = e.target.value;
      const newData = { ...noteData, exercises: newExercises };
      setNoteData(newData);
      saveNote(newData); // 即時保存
    },
    [noteData, saveNote, setNoteData]
  );

  const handleDateChange = useCallback(
    (newDate: string) => {
      setNoteData((prevData: NoteData | null) => {
        if (!prevData) {
          return {
            date: newDate,
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
        return {
          ...prevData,
          date: newDate,
        };
      });
      router.push(`/note/new?date=${newDate}`);
    },
    [router, setNoteData]
  );

  return {
    handleInputChange,
    handleNoteChange,
    handleExerciseChange,
    handleDateChange,
  };
};

export default useNoteHandlers;

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { NoteData, Set, Exercise } from "../types/types";
import { apiRequestWithAuth } from "../../frontend/utils/apiClient";
import { getToken } from "../utils/tokenUtils";

const useNoteHandlers = (
  noteData: NoteData | null,
  setNoteData: React.Dispatch<React.SetStateAction<NoteData | null>>
) => {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  // トークン取得
  useEffect(() => {
    const savedToken = getToken();
    if (savedToken) setToken(savedToken);
  }, []);

  // データ取得処理
  const fetchNoteData = useCallback(
    async (date: string) => {
      try {
        const response = await apiRequestWithAuth<{ notes: NoteData[] }>(
          `${process.env.NEXT_PUBLIC_API_URL}/api/notes/${date}`,
          "get"
        );

        console.log("Fetched response.notes:", response.notes); // デバッグ追加

        if (response.notes && response.notes.length > 0) {
          const { note, exercises } = response.notes[0];

          // exercisesがstringの場合、JSONパースする
          const parsedExercises: Exercise[] =
            typeof exercises === "string" ? JSON.parse(exercises) : exercises;

          const filledExercises = Array.from({ length: 30 }).map((_, exerciseIndex) => {
            const existingExercise = parsedExercises[exerciseIndex] || { exercise: "", sets: [] };
            return {
              exercise: existingExercise.exercise || "",
              sets: Array.from({ length: 5 }).map((_, setIndex) => existingExercise.sets[setIndex] || {
                weight: "",
                reps: "",
                rest: "",
              }),
            };
          });

          setNoteData({ date, note, exercises: filledExercises });
        } else {
          console.log("No note data found, initializing with empty values");
          setNoteData({
            date,
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
      } catch (error) {
        console.error("Failed to fetch note data:", error);
      }
    },
    [setNoteData]
  );

  // 保存処理
  const saveNote = useCallback(
    async (data: NoteData) => {
      try {
        const saveData = {
          ...data,
          exercises: JSON.stringify(data.exercises),
        };
        await apiRequestWithAuth(
          `${process.env.NEXT_PUBLIC_API_URL}/api/notes/${data.date}`,
          "post",
          saveData
        );
      } catch (error) {
        console.error("Failed to save note", error);
      }
    },
    []
  );

  // 入力変更ハンドラ
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
      saveNote(newData);
    },
    [noteData, saveNote, setNoteData]
  );

  const handleNoteChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!noteData) return;
      const newData = { ...noteData, note: e.target.value };
      setNoteData(newData);
      saveNote(newData);
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
      saveNote(newData);
    },
    [noteData, saveNote, setNoteData]
  );

  const handleDateChange = useCallback(
    (newDate: string) => {
      fetchNoteData(newDate);
      router.push(`/note/${newDate}`);
    },
    [fetchNoteData, router]
  );

  // 初回データ取得処理
  useEffect(() => {
    if (noteData?.date) {
      fetchNoteData(noteData.date);
    }
  }, [noteData?.date, fetchNoteData]);

  return {
    fetchNoteData,
    handleInputChange,
    handleNoteChange,
    handleExerciseChange,
    handleDateChange,
  };
};

export default useNoteHandlers;

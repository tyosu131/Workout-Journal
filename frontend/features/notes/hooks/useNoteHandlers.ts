// frontend/features/notes/hooks/useNoteHandlers.ts
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { NoteData, Set, Exercise } from "../../../types/types";
import { getToken } from "../../../../shared/utils/tokenUtils";
import { fetchNotesAPI, saveNoteAPI } from "../api"; // ← 新規 import
import { API_ENDPOINTS } from "../../../../shared/constants/endpoints";

/**
 * ノート関連のカスタムフック
 */
const useNoteHandlers = (
  noteData: NoteData | null,
  setNoteData: React.Dispatch<React.SetStateAction<NoteData | null>>
) => {
  const router = useRouter();
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = getToken();
    if (savedToken) setTokenState(savedToken);
  }, []);

  // ========================
  // ノートデータ取得
  // ========================
  const fetchNoteData = useCallback(
    async (date: string) => {
      try {
        const response = await fetchNotesAPI(date);
        if (response && response.length > 0) {
          const { note, exercises } = response[0];
          const parsedExercises: Exercise[] =
            typeof exercises === "string" ? JSON.parse(exercises) : exercises;

          const filledExercises = Array.from({ length: 30 }).map((_, exerciseIndex) => {
            const existingExercise = parsedExercises[exerciseIndex] || { exercise: "", sets: [] };
            return {
              exercise: existingExercise.exercise || "",
              sets: Array.from({ length: 5 }).map(
                (_, setIndex) =>
                  existingExercise.sets[setIndex] || {
                    weight: "",
                    reps: "",
                    rest: "",
                  }
              ),
            };
          });

          setNoteData({ date, note, exercises: filledExercises });
        } else {
          // 空データの初期化
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

  // ========================
  // ノート保存
  // ========================
  const saveNote = useCallback(
    async (data: NoteData) => {
      try {
        await saveNoteAPI(data);
      } catch (error) {
        console.error("Failed to save note", error);
      }
    },
    []
  );

  // ========================
  // フィールド更新ハンドラ
  // ========================
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

  // ========================
  // 初回読み込み
  // ========================
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

// frontend/features/notes/hooks/useNoteHandlers.ts
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { NoteData, Set, Exercise } from "../../../types/types";
import { getToken } from "../../../../shared/utils/tokenUtils";
import { fetchNotesAPI, saveNoteAPI } from "../api";

/**
 * ノート関連の操作（入力変更、日付変更、自動保存、+Add set/Exercise）
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

  // ノート保存（自動保存用）
  const saveNote = useCallback(async (data: NoteData) => {
    try {
      await saveNoteAPI(data);
    } catch (error) {
      console.error("Failed to save note", error);
    }
  }, []);

  // 各入力欄更新
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

  // 日付変更
  const handleDateChange = useCallback(
    (newDate: string) => {
      router.push(`/note/${newDate}`);
    },
    [router]
  );

  // +Add set（モバイル/タブレット用）
  const handleAddSet = useCallback(
    (exerciseIndex: number) => {
      if (!noteData) return;
      const newNote = { ...noteData };
      newNote.exercises[exerciseIndex].sets.push({
        weight: "",
        reps: "",
        rest: "",
      });
      setNoteData(newNote);
      saveNote(newNote);
    },
    [noteData, setNoteData, saveNote]
  );

  // +Add exercise（モバイル/タブレット用）
  const handleAddExercise = useCallback(() => {
    if (!noteData) return;
    const newNote = { ...noteData };
    newNote.exercises.push({
      exercise: "",
      sets: [
        {
          weight: "",
          reps: "",
          rest: "",
        },
      ],
    });
    setNoteData(newNote);
    saveNote(newNote);
  }, [noteData, setNoteData, saveNote]);

  // 初回読み込み（任意）
  useEffect(() => {
    if (noteData?.date) {
      // 必要なら再取得処理
    }
  }, [noteData?.date]);

  return {
    handleInputChange,
    handleNoteChange,
    handleExerciseChange,
    handleDateChange,
    handleAddSet,
    handleAddExercise,
  };
};

export default useNoteHandlers;

// portfolio real\frontend\features\notes\hooks\useNoteHandlers.ts

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { NoteData, Set, Exercise } from "../../../types/types";
import { getToken } from "../../../../shared/utils/tokenUtils";
import { saveNoteAPI } from "../api";

/**
 * ノート関連の操作をまとめたフック
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

  // ノート保存
  const saveNote = useCallback(async (data: NoteData) => {
    try {
      await saveNoteAPI(data);
    } catch (error) {
      console.error("Failed to save note", error);
    }
  }, []);

  // Set 入力変更
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

  // Exercise名変更
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

  // Exerciseメモ変更
  const handleExerciseNoteChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, index: number) => {
      if (!noteData) return;
      const newExercises = [...noteData.exercises];
      newExercises[index].note = e.target.value;
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

  // +Add set
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

  // +Add exercise
  const handleAddExercise = useCallback(() => {
    if (!noteData) return;
    const newNote = { ...noteData };
    newNote.exercises.push({
      exercise: "",
      note: "",
      sets: [{ weight: "", reps: "", rest: "" }],
    });
    setNoteData(newNote);
    saveNote(newNote);
  }, [noteData, setNoteData, saveNote]);

  // ★ 行(セット)の複製
  const handleDuplicateRow = useCallback(
    (exIndex: number, setIndex: number) => {
      if (!noteData) return;
      const newNote = { ...noteData };
      const originalSet = { ...newNote.exercises[exIndex].sets[setIndex] };
      // 複製を次の行に挿入
      newNote.exercises[exIndex].sets.splice(setIndex + 1, 0, originalSet);
      setNoteData(newNote);
      saveNote(newNote);
    },
    [noteData, setNoteData, saveNote]
  );

  // ★ Exercise全体の複製
  const handleDuplicateExercise = useCallback(
    (exIndex: number) => {
      if (!noteData) return;
      const newNote = { ...noteData };
      const originalEx = { ...newNote.exercises[exIndex] } as Exercise;
      // 深いコピーが必要なら sets もコピー
      const copiedEx: Exercise = {
        exercise: originalEx.exercise,
        note: originalEx.note || "",
        sets: originalEx.sets.map((s) => ({ ...s })),
      };
      // 挿入
      newNote.exercises.splice(exIndex + 1, 0, copiedEx);
      setNoteData(newNote);
      saveNote(newNote);
    },
    [noteData, setNoteData, saveNote]
  );

  // 行(セット)の削除
  const handleDeleteRow = useCallback(
    (exIndex: number, setIndex: number) => {
      if (!noteData) return;
      const newNote = { ...noteData };
      newNote.exercises[exIndex].sets.splice(setIndex, 1);
      setNoteData(newNote);
      saveNote(newNote);
    },
    [noteData, setNoteData, saveNote]
  );

  // Exercise削除
  const handleDeleteExercise = useCallback(
    (exIndex: number) => {
      if (!noteData) return;
      const newNote = { ...noteData };
      newNote.exercises.splice(exIndex, 1);
      setNoteData(newNote);
      saveNote(newNote);
    },
    [noteData, setNoteData, saveNote]
  );

  // タグ追加
  const handleAddTag = useCallback(
    (newTag: string) => {
      if (!noteData) return;
      const tags = noteData.tags ? [...noteData.tags] : [];
      if (!tags.includes(newTag)) {
        tags.push(newTag);
      }
      const newData = { ...noteData, tags };
      setNoteData(newData);
      saveNote(newData);
    },
    [noteData, setNoteData, saveNote]
  );

  // タグ削除
  const handleRemoveTag = useCallback(
    (tagIndex: number) => {
      if (!noteData?.tags) return;
      const tags = [...noteData.tags];
      tags.splice(tagIndex, 1);
      const newData = { ...noteData, tags };
      setNoteData(newData);
      saveNote(newData);
    },
    [noteData, setNoteData, saveNote]
  );

  return {
    handleInputChange,
    handleExerciseChange,
    handleExerciseNoteChange,
    handleDateChange,
    handleAddSet,
    handleAddExercise,
    handleDuplicateRow,       // ★ 行(セット)複製
    handleDuplicateExercise,  // ★ Exercise複製
    handleDeleteRow,
    handleDeleteExercise,
    handleAddTag,
    handleRemoveTag,
  };
};

export default useNoteHandlers;

// portfolio real\frontend\features\notes\hooks\useNoteHandlers.ts

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { NoteData, Set, Exercise } from "../../../types/types";
import { getToken } from "../../../../shared/utils/tokenUtils";
import { saveNoteAPI } from "../api";

/**
 * ノート操作（エクササイズ、セット操作）をまとめたフック
 */
const useNoteHandlers = (
  noteData: NoteData | null,
  setNoteData: React.Dispatch<React.SetStateAction<NoteData | null>>
) => {
  const router = useRouter();
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = getToken();
    if (savedToken) {
      setTokenState(savedToken);
    }
  }, []);

  // ノート保存
  const saveNote = useCallback(async (data: NoteData) => {
    try {
      await saveNoteAPI(data);
    } catch (error) {
      console.error("Failed to save note", error);
    }
  }, []);

  // --- Exercises/Set 操作 ---
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

  const handleDateChange = useCallback(
    (newDate: string) => {
      router.push(`/note/${newDate}`);
    },
    [router]
  );

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

  const handleDuplicateRow = useCallback(
    (exIndex: number, setIndex: number) => {
      if (!noteData) return;
      const newNote = { ...noteData };
      const originalSet = { ...newNote.exercises[exIndex].sets[setIndex] };
      newNote.exercises[exIndex].sets.splice(setIndex + 1, 0, originalSet);
      setNoteData(newNote);
      saveNote(newNote);
    },
    [noteData, setNoteData, saveNote]
  );

  const handleDuplicateExercise = useCallback(
    (exIndex: number) => {
      if (!noteData) return;
      const newNote = { ...noteData };
      const originalEx = { ...newNote.exercises[exIndex] } as Exercise;
      const copiedEx: Exercise = {
        exercise: originalEx.exercise,
        note: originalEx.note || "",
        sets: originalEx.sets.map((s) => ({ ...s })),
      };
      newNote.exercises.splice(exIndex + 1, 0, copiedEx);
      setNoteData(newNote);
      saveNote(newNote);
    },
    [noteData, setNoteData, saveNote]
  );

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

  return {
    handleInputChange,
    handleExerciseChange,
    handleExerciseNoteChange,
    handleDateChange,
    handleAddSet,
    handleAddExercise,
    handleDuplicateRow,
    handleDuplicateExercise,
    handleDeleteRow,
    handleDeleteExercise,
  };
};

export default useNoteHandlers;

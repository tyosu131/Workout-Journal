// portfolio real\frontend\features\notes\hooks\useNoteHandlers.ts

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { NoteData, Set, Exercise } from "../../../types/types";
import { getToken } from "../../../../shared/utils/tokenUtils";
import { saveNoteAPI, createTagAPI, fetchAllTagsAPI } from "../api";

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

  // --- タグ操作 ---
  const handleAddTag = useCallback(
    (newTag: string) => {
      if (!noteData) return;
      const currentTags = noteData.tags ? [...noteData.tags] : [];
      if (!currentTags.includes(newTag)) {
        currentTags.push(newTag);
      }
      const newData = { ...noteData, tags: currentTags };
      setNoteData(newData);
      saveNote(newData);
    },
    [noteData, setNoteData, saveNote]
  );

  // タグ削除（ローカル更新）
  const handleRemoveTag = useCallback(
    (tagIndex: number) => {
      if (!noteData?.tags) return;
      const currentTags = [...noteData.tags];
      currentTags.splice(tagIndex, 1);
      const newData = { ...noteData, tags: currentTags };
      setNoteData(newData);
      saveNote(newData);
    },
    [noteData, setNoteData, saveNote]
  );

  // タグ追加（DB保存も含む）
  const handleAddTagAndSave = useCallback(
    async (tag: string) => {
      if (!noteData) return;
      try {
        await createTagAPI(tag); // user_tags への保存
      } catch (err: any) {
        if (err?.response?.status !== 409) {
          console.error("Failed to create tag in user_tags:", err);
        }
      }
      handleAddTag(tag);
      const updated = { ...noteData, tags: noteData.tags ? [...noteData.tags, tag] : [tag] };
      setNoteData(updated);
      await saveNoteAPI(updated).catch(console.error);
    },
    [noteData, handleAddTag]
  );

  // タグ削除（DB保存も含む）
  const handleRemoveTagAndSave = useCallback(
    async (tagIndex: number) => {
      if (!noteData || !noteData.tags) return;
      // ここでは user_tags からの削除処理はルート側で行っているため、ローカル更新のみ
      handleRemoveTag(tagIndex);
      const updatedTags = noteData.tags.filter((_, i) => i !== tagIndex);
      const updated = { ...noteData, tags: updatedTags };
      setNoteData(updated);
      await saveNoteAPI(updated).catch(console.error);
    },
    [noteData, handleRemoveTag]
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
    handleAddTag,
    handleRemoveTag,
    handleAddTagAndSave,
    handleRemoveTagAndSave,
  };
};

export default useNoteHandlers;

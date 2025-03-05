// frontend/features/notes/hooks/useNoteHandlers.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { NoteData, Set } from "../../../types/types";
import { getToken } from "../../../../shared/utils/tokenUtils";
import { saveNoteAPI } from "../api";

/**
 * ノート関連の操作（入力変更、日付変更、自動保存、+Add set/Exercise、削除機能、メニュー外クリック検知）
 */
const useNoteHandlers = (
  noteData: NoteData | null,
  setNoteData: React.Dispatch<React.SetStateAction<NoteData | null>>,
  // 削除時にメニューを閉じるための関数（オプション）
  setOpenRowMenu?: React.Dispatch<React.SetStateAction<{ exIndex: number; setIndex: number } | null>>,
  setOpenExerciseMenu?: React.Dispatch<React.SetStateAction<number | null>>
) => {
  const router = useRouter();
  const [token, setTokenState] = useState<string | null>(null);

  // メニュー外クリック検知用の ref を内部で生成
  const exerciseMenuRef = useRef<HTMLDivElement | null>(null);
  const rowMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const savedToken = getToken();
    if (savedToken) setTokenState(savedToken);
  }, []);

  // --- handleDocClick を内部に統合 ---
  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (setOpenExerciseMenu && exerciseMenuRef.current) {
        if (!exerciseMenuRef.current.contains(e.target as Node)) {
          setOpenExerciseMenu(null);
        }
      }
      if (setOpenRowMenu && rowMenuRef.current) {
        if (!rowMenuRef.current.contains(e.target as Node)) {
          setOpenRowMenu(null);
        }
      }
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
    };
  }, [setOpenExerciseMenu, setOpenRowMenu]);

  // 自動保存
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
      sets: [{ weight: "", reps: "", rest: "" }],
    });
    setNoteData(newNote);
    saveNote(newNote);
  }, [noteData, setNoteData, saveNote]);

  // 削除機能
  const handleDeleteRow = useCallback(
    (exIndex: number, setIndex: number) => {
      if (!noteData) return;
      const newNote = { ...noteData };
      newNote.exercises[exIndex].sets.splice(setIndex, 1);
      setNoteData(newNote);
      saveNote(newNote);
      if (setOpenRowMenu) setOpenRowMenu(null);
    },
    [noteData, setNoteData, saveNote, setOpenRowMenu]
  );

  const handleDeleteExercise = useCallback(
    (exIndex: number) => {
      if (!noteData) return;
      const newNote = { ...noteData };
      newNote.exercises.splice(exIndex, 1);
      setNoteData(newNote);
      saveNote(newNote);
      if (setOpenExerciseMenu) setOpenExerciseMenu(null);
    },
    [noteData, setNoteData, saveNote, setOpenExerciseMenu]
  );

  return {
    exerciseMenuRef,
    rowMenuRef,
    handleInputChange,
    handleNoteChange,
    handleExerciseChange,
    handleDateChange,
    handleAddSet,
    handleAddExercise,
    handleDeleteRow,
    handleDeleteExercise,
  };
};

export default useNoteHandlers;

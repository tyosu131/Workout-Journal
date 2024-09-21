import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { NoteData, Set } from "../types/types";
import supabase from "../../backend/supabaseClient";
import { apiRequestWithAuth } from "../../frontend/utils/apiClient"; // APIクライアントのインポート

const useNoteHandlers = (
  noteData: NoteData | null,
  setNoteData: React.Dispatch<React.SetStateAction<NoteData | null>>
) => {
  const router = useRouter(); // routerを定義
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      const { data: sessionData, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Failed to get session:", error);
        return;
      }

      if (sessionData?.session) {
        const accessToken = sessionData.session.access_token;
        setToken(accessToken); // トークンを保存
      }
    };

    fetchToken();
  }, []);

  const saveNote = useCallback(
    async (data: NoteData) => {
      try {
        const response = await apiRequestWithAuth(
          `${process.env.NEXT_PUBLIC_API_URL}/api/notes/${data.date}`,
          "post",
          data
        );
        console.log("Saved response:", response);
      } catch (error) {
        console.error("Failed to save note", error);
      }
    },
    [] // トークンは内部でAPIクライアントが処理するので、依存関係に含めない
  );

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
    [noteData, saveNote, setNoteData] // 依存関係としてnoteData, saveNote, setNoteDataを追加
  );

  const handleNoteChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!noteData) return;
      const newData = { ...noteData, note: e.target.value };
      setNoteData(newData);
      saveNote(newData); // 即時保存
    },
    [noteData, saveNote, setNoteData] // 依存関係としてnoteData, saveNote, setNoteDataを追加
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
    [noteData, saveNote, setNoteData] // 依存関係としてnoteData, saveNote, setNoteDataを追加
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
    [router, setNoteData] // router, setNoteDataを依存関係に追加
  );

  return {
    handleInputChange,
    handleNoteChange,
    handleExerciseChange,
    handleDateChange,
  };
};

export default useNoteHandlers;

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { NoteData, Set, Exercise } from "../types/types";
import { apiRequestWithAuth } from "../../shared/utils/apiClient";
import { getToken } from "../../shared/utils/tokenUtils";
import { API_ENDPOINTS } from "../../shared/constants/endpoints";

const useNoteHandlers = (
    noteData: NoteData | null,
    setNoteData: React.Dispatch<React.SetStateAction<NoteData | null>>
) => {
    const router = useRouter();
    const [token, setToken] = useState<string | null>(null);

    // トークン取得処理
    useEffect(() => {
        const savedToken = getToken();
        if (savedToken) setToken(savedToken);
    }, []);

    // データ取得処理
    const fetchNoteData = useCallback(
        async (date: string) => {
            try {
                const response = await apiRequestWithAuth<{ notes: NoteData[] }>(
                    `${process.env.NEXT_PUBLIC_API_URL}${API_ENDPOINTS.NOTES(date)}`,
                    "get"
                );

                if (response.notes && response.notes.length > 0) {
                    const { note, exercises } = response.notes[0];
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
                    `${process.env.NEXT_PUBLIC_API_URL}${API_ENDPOINTS.NOTES(data.date)}`,
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

// frontend/features/notes/api.ts
import { apiRequestWithAuth } from "../../lib/apiClient";
import { API_ENDPOINTS } from "../../../shared/constants/endpoints";
import { NoteData } from "../../types/types";

/**
 * ノート一覧 or 1件取得 API
 */
export async function fetchNotesAPI(date: string): Promise<NoteData[]> {
  const response = await apiRequestWithAuth<{ notes: NoteData[] }>(
    API_ENDPOINTS.NOTES(date),
    "get"
  );
  const notes = response.notes || [];

  // exercises が文字列なら parse して配列に直す
  notes.forEach((note) => {
    if (typeof note.exercises === "string") {
      try {
        note.exercises = JSON.parse(note.exercises);
      } catch (e) {
        console.error("Failed to parse exercises:", e);
        note.exercises = [];
      }
    }
    if (!Array.isArray(note.exercises)) {
      note.exercises = [];
    }
  });

  return notes;
}

/**
 * ノートを保存（作成/更新）API
 * → DB には文字列として保存する
 */
export async function saveNoteAPI(noteData: NoteData): Promise<void> {
  const saveData = {
    ...noteData,
    exercises: JSON.stringify(noteData.exercises),
  };
  await apiRequestWithAuth(API_ENDPOINTS.NOTES(noteData.date), "post", saveData);
}

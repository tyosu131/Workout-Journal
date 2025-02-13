// frontend/features/notes/api.ts
import { apiRequestWithAuth } from "../../lib/apiClient";
import { API_ENDPOINTS } from "../../../shared/constants/endpoints";
import { NoteData } from "../../../frontend/types/types";

/**
 * ノート一覧 or 1件取得 API
 */
export async function fetchNotesAPI(date: string): Promise<NoteData[]> {
  const response = await apiRequestWithAuth<{ notes: NoteData[] }>(
    API_ENDPOINTS.NOTES(date),
    "get"
  );
  return response.notes || [];
}

/**
 * ノートを保存（作成/更新）API
 */
export async function saveNoteAPI(noteData: NoteData): Promise<void> {
  const saveData = {
    ...noteData,
    exercises: JSON.stringify(noteData.exercises),
  };
  await apiRequestWithAuth(API_ENDPOINTS.NOTES(noteData.date), "post", saveData);
}

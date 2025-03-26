// portfolio real\frontend\features\notes\api.ts

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

  notes.forEach((note) => {
    parseNoteFields(note);
  });

  return notes;
}

export async function fetchNotesInRangeAPI(
  start: string,
  end: string
): Promise<NoteData[]> {
  // フロントからは `/api/notes/range?start=...&end=...` を呼ぶ
  const url = `/api/notes/range?start=${start}&end=${end}`;
  const response = await apiRequestWithAuth<{ notes: NoteData[] }>(url, "get");
  const notes = response.notes || [];
  notes.forEach((note) => parseNoteFields(note));
  return notes;
}

/**
 * ノートを保存（作成/更新）API
 */
export async function saveNoteAPI(noteData: NoteData): Promise<void> {
  const saveData = {
    ...noteData,
    exercises: JSON.stringify(noteData.exercises),
    tags: noteData.tags || [],
  };

  await apiRequestWithAuth(API_ENDPOINTS.NOTES(noteData.date), "post", saveData);
}

/**
 * すべてのタグ一覧を取得する API
 */
export async function fetchAllTagsAPI(): Promise<string[]> {
  const response = await apiRequestWithAuth<{ tags: string[] }>(
    API_ENDPOINTS.NOTES_ALL_TAGS,
    "get"
  );
  return response.tags || [];
}

/**
 * 指定したタグを含むノート一覧を取得する API
 */
export async function fetchNotesByTagsAPI(tags: string[]): Promise<NoteData[]> {
  const tagString = tags.join(",");
  const response = await apiRequestWithAuth<{ notes: NoteData[] }>(
    `${API_ENDPOINTS.NOTES_BY_TAGS}?tags=${tagString}`,
    "get"
  );

  const notes = response.notes || [];
  notes.forEach((note) => {
    parseNoteFields(note);
  });
  return notes;
}

/**
 * タグを新規作成（DBに保存）API
 * POST /api/notes/tag
 */
export async function createTagAPI(tag: string): Promise<void> {
  await apiRequestWithAuth(API_ENDPOINTS.NOTES_TAG, "post", { tag });
}

/**
 * タグを削除（DBから削除）API
 * DELETE /api/notes/tag/:tagName
 */
export async function deleteTagAPI(tag: string): Promise<void> {
  const encodedTag = encodeURIComponent(tag);
  await apiRequestWithAuth(`${API_ENDPOINTS.NOTES_TAG}/${encodedTag}`, "delete");
}

/** exercises / tags が文字列の場合にパースする共通関数 */
function parseNoteFields(note: NoteData) {
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
  if (!note.tags) {
    note.tags = [];
  }
}

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

/**
 * ノートを保存（作成/更新）API
 * DB の tags カラムを text[] にした場合、
 * tags は配列としてそのまま送る。
 */
export async function saveNoteAPI(noteData: NoteData): Promise<void> {
  // exercises は JSON 文字列で送るなら従来どおり
  // tags は配列のまま
  const saveData = {
    ...noteData,
    exercises: JSON.stringify(noteData.exercises),
    tags: noteData.tags || [], // ★ ここで配列をそのまま送る
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

/** exercises / tags が文字列の場合にパースする共通関数 */
function parseNoteFields(note: NoteData) {
  // exercises は JSON文字列ならパース
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

  // tags は text[] → row.tags が配列 or null
  // 文字列パースは不要
  if (!note.tags) {
    note.tags = [];
  }
}

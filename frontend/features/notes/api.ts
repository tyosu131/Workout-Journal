// portfolio real\frontend\features\notes\api.ts

import { apiRequestWithAuth } from "../../lib/apiClient";
import { API_ENDPOINTS } from "../../../shared/constants/endpoints";
import { NoteData } from "../../types/types";
import { getErrorSummary } from "../../lib/errorSummary";

/**
 * API for fetching a note list or one note
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
  const url = API_ENDPOINTS.NOTES_RANGE(start, end);
  const response = await apiRequestWithAuth<{ notes: NoteData[] }>(url, "get");
  const notes = response.notes || [];
  notes.forEach((note) => parseNoteFields(note));
  return notes;
}

/**
 * API for saving a note (create or update)
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
 * API for fetching all tags
 */
export async function fetchAllTagsAPI(): Promise<string[]> {
  const response = await apiRequestWithAuth<{ tags: string[] }>(
    API_ENDPOINTS.NOTES_ALL_TAGS,
    "get"
  );
  return response.tags || [];
}

/**
 * API for fetching notes containing a specified tag
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
 * API for creating and persisting a new tag
 * POST /notes/tag
 */
export async function createTagAPI(tag: string): Promise<void> {
  await apiRequestWithAuth(API_ENDPOINTS.NOTES_TAG, "post", { tag });
}

/**
 * API for deleting a tag from the database
 * DELETE /notes/tag/:tagName
 */
export async function deleteTagAPI(tag: string): Promise<void> {
  const encodedTag = encodeURIComponent(tag);
  await apiRequestWithAuth(`${API_ENDPOINTS.NOTES_TAG}/${encodedTag}`, "delete");
}

/** Shared helper for parsing exercises or tags when they are strings */
function parseNoteFields(note: NoteData) {
  if (typeof note.exercises === "string") {
    try {
      note.exercises = JSON.parse(note.exercises);
    } catch (e) {
      console.error("Failed to parse exercises:", getErrorSummary(e));
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

import { useState, useCallback } from "react";
import { NoteData } from "../../../types/types";
import { fetchNotesByTagsAPI } from "../api";

export function usePreviousNotes(noteData: NoteData | null) {
  const [showPrevious, setShowPrevious] = useState(false);
  const [previousNotes, setPreviousNotes] = useState<NoteData[]>([]);

  const fetchPreviousNotes = useCallback(async () => {
    if (!noteData || !noteData.tags || noteData.tags.length === 0) {
      setPreviousNotes([]);
      setShowPrevious(true);
      return;
    }
    try {
      const notes = await fetchNotesByTagsAPI(noteData.tags);
      setPreviousNotes(notes);
    } catch (error) {
      console.error("Failed to fetch previous notes:", error);
      setPreviousNotes([]);
    }
    setShowPrevious(true);
  }, [noteData]);

  const hidePreviousNotes = useCallback(() => {
    setShowPrevious(false);
  }, []);

  return { showPrevious, previousNotes, fetchPreviousNotes, hidePreviousNotes };
}

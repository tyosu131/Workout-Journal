// portfolio real\frontend\features\notes\hooks\useTagHandlers.ts

import { useCallback } from "react";
import { NoteData } from "../../../types/types";
import { saveNoteAPI, createTagAPI } from "../api";
import { getErrorSummary } from "../../../lib/errorSummary";

/**
 * Hook that groups tag operations
 */
const useTagHandlers = (
  noteData: NoteData | null,
  setNoteData: React.Dispatch<React.SetStateAction<NoteData | null>>
) => {
  // Add a tag locally and save the note
  const handleAddTag = useCallback(
    (newTag: string) => {
      if (!noteData) return;
      const currentTags = noteData.tags ? [...noteData.tags] : [];
      if (!currentTags.includes(newTag)) {
        currentTags.push(newTag);
      }
      const updated = { ...noteData, tags: currentTags };
      setNoteData(updated);
      saveNoteAPI(updated).catch((error) => {
        console.error("Failed to save tag change:", getErrorSummary(error));
      });
    },
    [noteData, setNoteData]
  );

  // Remove a tag locally and save the note
  const handleRemoveTag = useCallback(
    (tagIndex: number) => {
      if (!noteData || !noteData.tags) return;
      const currentTags = [...noteData.tags];
      currentTags.splice(tagIndex, 1);
      const updated = { ...noteData, tags: currentTags };
      setNoteData(updated);
      saveNoteAPI(updated).catch((error) => {
        console.error("Failed to save tag change:", getErrorSummary(error));
      });
    },
    [noteData, setNoteData]
  );

  // Add a tag, including database persistence
  const handleAddTagAndSave = useCallback(
    async (tag: string) => {
      if (!noteData) return;
      try {
        await createTagAPI(tag);
      } catch (err: unknown) {
        console.error("Failed to create tag in user_tags:", getErrorSummary(err));
      }
      handleAddTag(tag);
    },
    [noteData, handleAddTag]
  );

  // Delete a tag, including database persistence
  const handleRemoveTagAndSave = useCallback(
    async (tagIndex: number) => {
      if (!noteData || !noteData.tags) return;
      handleRemoveTag(tagIndex);
      // The backend deleteTag API removes the entry from user_tags
    },
    [noteData, handleRemoveTag]
  );

  return {
    handleAddTag,
    handleRemoveTag,
    handleAddTagAndSave,
    handleRemoveTagAndSave,
  };
};

export default useTagHandlers;

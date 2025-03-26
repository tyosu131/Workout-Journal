// portfolio real\frontend\features\notes\hooks\useTagHandlers.ts

import { useCallback } from "react";
import { NoteData } from "../../../types/types";
import { saveNoteAPI, createTagAPI } from "../api";

/**
 * タグ操作をまとめたフック
 */
const useTagHandlers = (
  noteData: NoteData | null,
  setNoteData: React.Dispatch<React.SetStateAction<NoteData | null>>
) => {
  // タグをローカルに追加してノートを保存
  const handleAddTag = useCallback(
    (newTag: string) => {
      if (!noteData) return;
      const currentTags = noteData.tags ? [...noteData.tags] : [];
      if (!currentTags.includes(newTag)) {
        currentTags.push(newTag);
      }
      const updated = { ...noteData, tags: currentTags };
      setNoteData(updated);
      saveNoteAPI(updated).catch(console.error);
    },
    [noteData, setNoteData]
  );

  // タグをローカルから削除してノートを保存
  const handleRemoveTag = useCallback(
    (tagIndex: number) => {
      if (!noteData || !noteData.tags) return;
      const currentTags = [...noteData.tags];
      currentTags.splice(tagIndex, 1);
      const updated = { ...noteData, tags: currentTags };
      setNoteData(updated);
      saveNoteAPI(updated).catch(console.error);
    },
    [noteData, setNoteData]
  );

  // タグ追加（DB保存も含む）
  const handleAddTagAndSave = useCallback(
    async (tag: string) => {
      if (!noteData) return;
      try {
        await createTagAPI(tag);
      } catch (err: any) {
        if (err?.response?.status !== 409) {
          console.error("Failed to create tag in user_tags:", err);
        }
      }
      handleAddTag(tag);
    },
    [noteData, handleAddTag]
  );

  // タグ削除（DB保存も含む）
  const handleRemoveTagAndSave = useCallback(
    async (tagIndex: number) => {
      if (!noteData || !noteData.tags) return;
      handleRemoveTag(tagIndex);
      // DB側の user_tags からの削除はバックエンドの deleteTag API が担当
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

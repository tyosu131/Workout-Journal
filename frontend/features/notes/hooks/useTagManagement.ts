// portfolio real\frontend\features\notes\hooks\useTagManagement.ts

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@chakra-ui/react";
import {
  fetchAllTagsAPI,
  createTagAPI,
  deleteTagAPI,
} from "../api";

/**
 * Tag管理ロジックをまとめたフック
 */
export function useTagManagement() {
  const toast = useToast();
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // 初回読み込み時にタグ一覧取得
  useEffect(() => {
    fetchAllTagsAPI()
      .then((fetched) => setTags(fetched))
      .catch((err) => {
        console.error("Failed to fetch tags:", err);
        toast({
          title: "Error",
          description: "Failed to load tags.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      });
  }, [toast]);

  // 検索後のタグ一覧
  const filteredTags = tags.filter((tag) =>
    tag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // タグ作成
  const handleCreateTag = useCallback(async () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;

    // 既存チェック（フロント側での重複防止）
    if (tags.includes(trimmed)) {
      toast({
        title: "Duplicate tag",
        description: `Tag "${trimmed}" already exists.`,
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    try {
      await createTagAPI(trimmed); // サーバーへ作成リクエスト
      // 成功したらタグ一覧を再取得
      const updated = await fetchAllTagsAPI();
      setTags(updated);
      setNewTag("");

      toast({
        title: "Tag created",
        description: `Tag "${trimmed}" was added to DB.`,
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (err: any) {
      // ここで 409 は「すでに存在するタグ」を示す
      if (err?.response?.status === 409) {
        // console.error は出さずに、トーストなどで「既に存在」と伝える
        toast({
          title: "Duplicate tag",
          description: `Tag "${trimmed}" already exists.`,
          status: "warning",
          duration: 2000,
          isClosable: true,
        });
      } else {
        // 409以外は本当のエラーなのでコンソールエラーを出す
        console.error("Failed to create tag", err);
        toast({
          title: "Error",
          description: err.message || "Failed to create tag.",
          status: "error",
          duration: 2000,
          isClosable: true,
        });
      }
    }
  }, [newTag, tags, toast]);

  // タグ削除
  const handleDeleteTag = useCallback(async (tagToDelete: string) => {
    try {
      await deleteTagAPI(tagToDelete);
      const updated = await fetchAllTagsAPI();
      setTags(updated);

      toast({
        title: "Tag deleted",
        description: `Tag "${tagToDelete}" was removed from DB.`,
        status: "info",
        duration: 2000,
        isClosable: true,
      });
    } catch (err: any) {
      console.error("Failed to delete tag", err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete tag.",
        status: "error",
        duration: 2000,
        isClosable: true,
      });
    }
  }, [toast]);

  return {
    tags,
    newTag,
    searchTerm,
    filteredTags,
    setNewTag,
    setSearchTerm,
    handleCreateTag,
    handleDeleteTag,
  };
}

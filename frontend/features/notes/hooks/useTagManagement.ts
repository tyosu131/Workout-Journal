// portfolio real\frontend\features\notes\hooks\useTagManagement.ts

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@chakra-ui/react";
import {
  fetchAllTagsAPI,
  createTagAPI,
  deleteTagAPI,
} from "../api";
import { getErrorSummary } from "../../../lib/errorSummary";

/**
 * Hook that groups tag management logic
 */
export function useTagManagement() {
  const toast = useToast();
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch the tag list on initial load
  useEffect(() => {
    fetchAllTagsAPI()
      .then((fetched) => setTags(fetched))
      .catch((err) => {
        console.error("Failed to fetch tags:", getErrorSummary(err));
        toast({
          title: "Error",
          description: "Failed to load tags.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      });
  }, [toast]);

  // Tag list after filtering
  const filteredTags = tags.filter((tag) =>
    tag.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Create tag
  const handleCreateTag = useCallback(async () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;

    // Check for duplicates on the frontend
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
      await createTagAPI(trimmed); // Request creation from the server
      // Refetch the tag list after success
      const updated = await fetchAllTagsAPI();
      setTags(updated);
      setNewTag("");

      toast({
        title: "Tag created",
        description: `Tag "${trimmed}" was created.`,
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (err: any) {
      console.error("Failed to create tag", getErrorSummary(err));
      toast({
        title: "Error",
        description: err.message || "Failed to create tag.",
        status: "error",
        duration: 2000,
        isClosable: true,
      });
    }
  }, [newTag, tags, toast]);

  // Delete tag
  const handleDeleteTag = useCallback(async (tagToDelete: string) => {
    try {
      await deleteTagAPI(tagToDelete);
      const updated = await fetchAllTagsAPI();
      setTags(updated);

      toast({
        title: "Tag deleted",
        description: `Tag "${tagToDelete}" was deleted.`,
        status: "info",
        duration: 2000,
        isClosable: true,
      });
    } catch (err: any) {
      console.error("Failed to delete tag", getErrorSummary(err));
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

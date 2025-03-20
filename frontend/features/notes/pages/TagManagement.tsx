// portfolio real\frontend\features\notes\pages\TagManagement.tsx

import React, { useState, useEffect } from "react";
import {
  Box,
  Text,
  IconButton,
  Button,
  Input,
  FormControl,
  FormLabel,
  Flex,
  Spacer,
  Divider,
  CloseButton,
  VStack,
  useToast,
  Tag,
  TagLabel,
  TagCloseButton,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import {
  fetchAllTagsAPI,
  createTagAPI,
  deleteTagAPI, // ★ DB連動API
} from "../api";
import { useTagColor } from "../contexts/TagColorContext";

const TagManagement: React.FC = () => {
  const router = useRouter();
  const toast = useToast();

  // 全タグ一覧
  const [tags, setTags] = useState<string[]>([]);

  // 新規タグ作成用
  const [newTag, setNewTag] = useState("");

  // 検索用
  const [searchTerm, setSearchTerm] = useState("");

  // NotePage/TopPage と同じタグ色を取得するフック
  const { getTagColor } = useTagColor();

  // 初回マウント時にタグ一覧取得
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

  const handleClose = () => {
    router.push("/top");
  };

  /**
   * 新規タグ作成 (DB連動)
   */
  const handleCreateTag = async () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;

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
      // DBに作成
      await createTagAPI(trimmed);

      // 再取得
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
      console.error("Failed to create tag", err);
      toast({
        title: "Error",
        description: err.message || "Failed to create tag.",
        status: "error",
        duration: 2000,
        isClosable: true,
      });
    }
  };

  /**
   * タグ削除 (DB連動)
   */
  const handleDeleteTag = async (tagToDelete: string) => {
    try {
      await deleteTagAPI(tagToDelete);

      // 再取得
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
  };

  return (
    <Box
      maxW="5xl"
      mx="auto"
      mt={10}
      p={8}
      boxShadow="lg"
      borderRadius="md"
      position="relative"
    >
      <IconButton
        aria-label="Close"
        icon={<CloseButton />}
        onClick={handleClose}
        position="absolute"
        top={2}
        right={2}
        variant="ghost"
        size="lg"
      />

      <Box fontSize="2xl" fontWeight="bold" textAlign="center" mb={8}>
        Tag Management
      </Box>

      <FormControl mb={4}>
        <FormLabel fontSize="lg">Search Tags</FormLabel>
        <Input
          placeholder="Type to search..."
          fontSize="lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          focusBorderColor="blue.300"
        />
      </FormControl>

      <Divider mb={4} />

      <FormControl mb={4}>
        <FormLabel fontSize="lg">Add Tag</FormLabel>
        <Flex>
          <Input
            flex="1"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Enter new tag"
            fontSize="lg"
          />
          <Button ml={3} colorScheme="blue" onClick={handleCreateTag}>
            Create
          </Button>
        </Flex>
      </FormControl>

      <Divider mb={4} />

      {filteredTags.length > 0 ? (
        <Flex gap={2} wrap="wrap">
          {filteredTags.map((tag) => {
            const colorScheme = getTagColor(tag);
            return (
              <Tag
                key={tag}
                size="md"
                colorScheme={colorScheme}
                borderRadius="full"
                py={1}
                px={3}
              >
                <TagLabel fontSize="md">{tag}</TagLabel>
                <TagCloseButton
                  onClick={() => handleDeleteTag(tag)}
                  ml={1}
                />
              </Tag>
            );
          })}
        </Flex>
      ) : (
        <Text color="gray.500" mt={2}>
          No tags found.
        </Text>
      )}
    </Box>
  );
};

export default TagManagement;

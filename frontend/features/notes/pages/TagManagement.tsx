// portfolio real\frontend\features\notes\pages\TagManagement.tsx

import React from "react";
import {
  Box,
  Text,
  IconButton,
  Button,
  Input,
  FormControl,
  FormLabel,
  Flex,
  Divider,
  CloseButton,
  Tag,
  TagLabel,
  TagCloseButton,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useTagColor } from "../contexts/TagColorContext";
import { useTagManagement } from "../hooks/useTagManagement";

const TagManagement: React.FC = () => {
  const router = useRouter();

  const {
    tags,
    newTag,
    searchTerm,
    filteredTags,
    setNewTag,
    setSearchTerm,
    handleCreateTag,
    handleDeleteTag,
  } = useTagManagement();

  const { getTagStyle } = useTagColor();

  const handleClose = () => {
    router.push("/top");
  };

  return (
    <Box
      /* Mobile: 90% width; desktop: 5xl */
      maxW={{ base: "90%", lg: "5xl" }}
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

      {/* Search Tags */}
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

      {/* Add Tag */}
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

      {/* Tag list */}
      {filteredTags.length > 0 ? (
        <Flex gap={2} wrap="wrap">
          {filteredTags.map((tag) => {
            const tagStyle = getTagStyle(tag);
            return (
              <Tag
                key={tag}
                size="md"
                {...tagStyle}
                borderRadius="full"
                py={1}
                px={3}
              >
                <TagLabel fontSize="md">{tag}</TagLabel>
                <TagCloseButton onClick={() => handleDeleteTag(tag)} ml={1} opacity={0.8} />
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

// portfolio real\frontend\features\notes\pages\note-page.tsx

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Text,
  Spinner,
  Center,
  Button,
  useBreakpointValue,
  Input,
  Tag,
  TagLabel,
  TagCloseButton,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Flex,
} from "@chakra-ui/react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  AddIcon,
  SettingsIcon,
} from "@chakra-ui/icons";
import useSWR from "swr";
import Header from "./header";
import DateInput from "./date-input";
import { NoteData } from "../../../types/types";
import {
  fetchNotesAPI,
  saveNoteAPI,
  fetchAllTagsAPI,
  fetchNotesByTagsAPI,
  createTagAPI,
} from "../api";
import useNoteHandlers from "../hooks/useNoteHandlers";
import { useTagColor } from "../contexts/TagColorContext";

const NotePage: React.FC = () => {
  const router = useRouter();
  const { date } = router.query;
  const containerWidth = useBreakpointValue({ base: "100%", lg: "75%" });

  const [noteData, setNoteData] = useState<NoteData | null>(null);
  const [newTag, setNewTag] = useState("");
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [folded, setFolded] = useState<boolean[]>([]);
  const [showPrevious, setShowPrevious] = useState(false);
  const previousPopupRef = useRef<HTMLDivElement | null>(null);
  const [previousNote, setPreviousNote] = useState<NoteData | null>(null);

  // タグの色を取得するフック
  const { getTagColor } = useTagColor();

  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      router.push("/login");
      return;
    }
    setToken(storedToken);
  }, [router]);

  // 指定日付のノートを SWR で取得
  const { data } = useSWR<NoteData[]>(
    date ? String(date) : null,
    (d: string) => fetchNotesAPI(d),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  // 全タグを取得
  useEffect(() => {
    fetchAllTagsAPI()
      .then((tags) => setAllTags(tags))
      .catch((err) => console.error("Failed to fetch all tags:", err));
  }, []);

  // ノートデータを初期化
  useEffect(() => {
    if (!date) return;
    if (data && data.length > 0) {
      setNoteData(data[0]);
      setFolded(new Array(data[0].exercises.length).fill(false));
    } else if (data && data.length === 0) {
      const newNote: NoteData = {
        date: String(date),
        note: "",
        exercises: [
          {
            exercise: "",
            note: "",
            sets: [{ weight: "", reps: "", rest: "" }],
          },
        ],
        tags: [],
      };
      setNoteData(newNote);
      setFolded([false]);
    }
  }, [date, data]);

  useEffect(() => {
    if (noteData && noteData.note.trim().length > 0 && router.asPath.includes("new")) {
      router.replace(`/note/${noteData.date}`);
    }
  }, [noteData, router]);

  // Previous ポップアップの外側クリックで閉じる
  useEffect(() => {
    if (!showPrevious) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        previousPopupRef.current &&
        !previousPopupRef.current.contains(e.target as Node)
      ) {
        setShowPrevious(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPrevious]);

  // useNoteHandlers からハンドラ取得
  const {
    handleInputChange,
    handleExerciseChange,
    handleExerciseNoteChange,
    handleDateChange,
    handleAddSet,
    handleAddExercise,
    handleDuplicateRow,
    handleDuplicateExercise,
    handleDeleteRow,
    handleDeleteExercise,
    handleAddTagAndSave,
    handleRemoveTagAndSave,
  } = useNoteHandlers(noteData, setNoteData);

  // タグ入力欄: Enterキー押下時
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newTag.trim()) {
      handleAddTagAndSave(newTag.trim());
      setNewTag("");
      setIsTagPopoverOpen(false);
    }
  };

  // タグ入力欄: フォーカス時 → ポップオーバー表示 & 全タグ再取得
  const handleTagInputFocus = () => {
    setIsTagPopoverOpen(true);
    fetchAllTagsAPI()
      .then((tags) => setAllTags(tags))
      .catch(console.error);
  };

  // タグ候補クリック
  const handleTagOptionClick = (tag: string) => {
    handleAddTagAndSave(tag);
    setNewTag("");
    setIsTagPopoverOpen(false);
  };

  // Previous ボタン → 過去ノートポップアップ
  const handleShowPreviousNotes = async () => {
    if (!noteData?.tags || noteData.tags.length === 0) {
      setPreviousNote(null);
      setShowPrevious(true);
      return;
    }
    try {
      const allNotes = await fetchNotesByTagsAPI(noteData.tags);
      const older = allNotes.filter((n) => n.date < noteData.date);
      if (older.length === 0) {
        setPreviousNote(null);
      } else {
        older.sort((a, b) => b.date.localeCompare(a.date));
        setPreviousNote(older[0]);
      }
    } catch (error) {
      console.error("Failed to fetch previous note:", error);
      setPreviousNote(null);
    }
    setShowPrevious(true);
  };

  // Exercise の折りたたみ切り替え
  const toggleFold = (exIndex: number) => {
    setFolded((prev) => {
      const newState = [...prev];
      newState[exIndex] = !newState[exIndex];
      return newState;
    });
  };

  // ローディング表示
  if (!noteData) {
    return (
      <Center height="100vh">
        <Spinner size="xl" />
        <Text ml={4}>Loading...</Text>
      </Center>
    );
  }

  return (
    <Box p={4}>
      <Header />

      <Text fontSize="2xl" mb={4} textAlign="center">
        Note
      </Text>

      {/* 日付入力 */}
      <Box width={containerWidth} margin="0 auto" mb={4}>
        <DateInput date={noteData.date} onDateChange={handleDateChange} />
      </Box>

      {/* タグ一覧 & 入力欄 */}
      <Box width={containerWidth} margin="0 auto" mb={6}>
        <Text fontWeight="bold" mb={2}>
          Tags:
        </Text>

        <Box display="flex" gap={4} alignItems="center" flexWrap="wrap" mb={2}>
          {/* 既存タグ表示 */}
          <Box display="flex" gap={2} flexWrap="wrap">
            {noteData.tags?.map((tag: string, idx: number) => {
              const colorScheme = getTagColor(tag);
              return (
                <Tag
                  key={idx}
                  size="md"
                  colorScheme={colorScheme}
                  borderRadius="full"
                >
                  <TagLabel>{tag}</TagLabel>
                  <TagCloseButton onClick={() => handleRemoveTagAndSave(idx)} />
                </Tag>
              );
            })}
          </Box>

          {/* タグ入力欄 → ポップオーバー */}
          <Popover
            isOpen={isTagPopoverOpen}
            onClose={() => setIsTagPopoverOpen(false)}
            closeOnBlur={true}
            placement="bottom-start"
          >
            <PopoverTrigger>
              <Input
                placeholder="Select an option or create one"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                width="30%"
                onKeyDown={handleTagInputKeyDown}
                onFocus={handleTagInputFocus}
              />
            </PopoverTrigger>

            <PopoverContent w="320px">
              <PopoverArrow />
              <PopoverCloseButton />
              <PopoverBody>
                <Text fontSize="sm" color="gray.500" mb={2}>
                  Select an option or create one
                </Text>
                {/* タグ候補を色付きで表示 */}
                {allTags.map((tagOption) => {
                  const colorScheme = getTagColor(tagOption);
                  return (
                    <Flex
                      key={tagOption}
                      p={2}
                      alignItems="center"
                      gap={2}
                      _hover={{ bg: "gray.100", cursor: "pointer" }}
                      onClick={() => handleTagOptionClick(tagOption)}
                    >
                      <Tag colorScheme={colorScheme} borderRadius="full">
                        <TagLabel>{tagOption}</TagLabel>
                      </Tag>
                    </Flex>
                  );
                })}
              </PopoverBody>
            </PopoverContent>
          </Popover>

          {/* Previous ボタン */}
          <Button
            variant="outline"
            onClick={handleShowPreviousNotes}
            transition="all 0.2s"
            _hover={{ transform: "scale(1.02)" }}
          >
            Previous
          </Button>
        </Box>

        {/* 過去ノートポップアップ */}
        {showPrevious && (
          <Box
            ref={previousPopupRef}
            position="absolute"
            top="250px"
            left="50%"
            transform="translateX(-50%)"
            bg="white"
            border="1px solid #ccc"
            borderRadius="md"
            p={4}
            shadow="md"
            zIndex={999}
            width="80%"
            maxW="600px"
          >
            {previousNote ? (
              <Box>
                <Text fontWeight="bold" mb={2}>
                  {previousNote.date} / Tags:{" "}
                  {previousNote.tags?.join(", ")}
                </Text>
                {previousNote.exercises.map((ex, i) => (
                  <Box
                    key={i}
                    mb={4}
                    p={2}
                    border="1px solid #ccc"
                    borderRadius="md"
                  >
                    <Text fontWeight="bold">Exercise: {ex.exercise}</Text>
                    <Text>Memo: {ex.note || "N/A"}</Text>
                    <Box
                      as="table"
                      border="1px solid #000"
                      __css={{ borderCollapse: "collapse", width: "100%" }}
                      mt={2}
                    >
                      <thead>
                        <tr>
                          <th style={thStyle}>#</th>
                          <th style={thStyle}>Weight</th>
                          <th style={thStyle}>Reps</th>
                          <th style={thStyle}>Rest</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ex.sets.map((s, j) => (
                          <tr key={j}>
                            <td style={tdStyle}>{j + 1}</td>
                            <td style={tdStyle}>{s.weight}</td>
                            <td style={tdStyle}>{s.reps}</td>
                            <td style={tdStyle}>{s.rest}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Text>(No older note found)</Text>
            )}

            <Button
              size="sm"
              onClick={() => setShowPrevious(false)}
              mt={4}
              transition="all 0.2s"
              _hover={{ transform: "scale(1.02)" }}
            >
              Close
            </Button>
          </Box>
        )}
      </Box>

      {/* Exercises 一覧 */}
      <Box width={containerWidth} margin="0 auto">
        {noteData.exercises.map((exercise, eIndex) => (
          <Box
            key={eIndex}
            border="1px solid #000"
            borderRadius="4px"
            p={3}
            mb={4}
            position="relative"
          >
            {/* 右上メニュー */}
            <Box position="absolute" top="4px" right="4px">
              <Menu isLazy={false}>
                <MenuButton
                  as={Button}
                  variant="ghost"
                  size="xs"
                  _hover={{ bg: "gray.100" }}
                >
                  ...
                </MenuButton>
                <MenuList>
                  <MenuItem onClick={() => handleDuplicateExercise(eIndex)}>
                    Duplicate
                  </MenuItem>
                  <MenuItem onClick={() => handleDeleteExercise(eIndex)}>
                    Delete
                  </MenuItem>
                </MenuList>
              </Menu>
            </Box>

            {/* Exercise タイトル行 */}
            <Box ml={1} mb={2} display="flex" alignItems="center">
              {folded[eIndex] ? (
                <Button
                  variant="ghost"
                  size="sm"
                  mr={2}
                  onClick={() => toggleFold(eIndex)}
                >
                  <ChevronRightIcon />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  mr={2}
                  onClick={() => toggleFold(eIndex)}
                >
                  <ChevronDownIcon />
                </Button>
              )}
              <Text fontWeight="bold" mr={2}>
                Exercise:
              </Text>
              <input
                style={{ width: "100%", border: "none", outline: "none" }}
                value={exercise.exercise}
                onChange={(ev) => handleExerciseChange(ev, eIndex)}
              />
            </Box>

            {/* メモ欄 */}
            <Box ml={1} mb={4}>
              <Text mb={1}>Memo:</Text>
              <Input
                placeholder="Write something about this exercise..."
                value={exercise.note || ""}
                onChange={(ev) => handleExerciseNoteChange(ev, eIndex)}
                size="sm"
              />
            </Box>

            {/* セットのテーブル */}
            {!folded[eIndex] && (
              <Box
                as="table"
                border="1px solid #000"
                __css={{ borderCollapse: "collapse", width: "100%" }}
              >
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Weight</th>
                    <th style={thStyle}>Reps</th>
                    <th style={thStyle}>Rest</th>
                    <th style={thStyle}>
                      <SettingsIcon />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exercise.sets.map((set, sIndex) => (
                    <tr key={sIndex}>
                      <td style={tdStyle}>{sIndex + 1}</td>
                      <td style={tdStyle}>
                        <input
                          style={inputStyle}
                          value={set.weight}
                          onChange={(ev) =>
                            handleInputChange(ev, eIndex, sIndex, "weight")
                          }
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          style={inputStyle}
                          value={set.reps}
                          onChange={(ev) =>
                            handleInputChange(ev, eIndex, sIndex, "reps")
                          }
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          style={inputStyle}
                          value={set.rest}
                          onChange={(ev) =>
                            handleInputChange(ev, eIndex, sIndex, "rest")
                          }
                        />
                      </td>
                      <td style={tdStyle}>
                        <Menu isLazy={false}>
                          <MenuButton
                            as={Button}
                            variant="ghost"
                            size="xs"
                            px={2}
                            _hover={{ bg: "gray.100" }}
                          >
                            ...
                          </MenuButton>
                          <MenuList>
                            <MenuItem
                              onClick={() => handleDuplicateRow(eIndex, sIndex)}
                            >
                              Duplicate
                            </MenuItem>
                            <MenuItem
                              onClick={() => handleDeleteRow(eIndex, sIndex)}
                            >
                              Delete
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "8px" }}>
                      <Button
                        size="sm"
                        leftIcon={<AddIcon />}
                        transition="all 0.2s"
                        _hover={{ transform: "scale(1.02)" }}
                        onClick={() => handleAddSet(eIndex)}
                      >
                        +Add set
                      </Button>
                    </td>
                  </tr>
                </tfoot>
              </Box>
            )}
          </Box>
        ))}

        {/* +Add Exercise ボタン */}
        <Box textAlign="center">
          <Button
            leftIcon={<AddIcon />}
            transition="all 0.2s"
            _hover={{ transform: "scale(1.02)" }}
            onClick={() => handleAddExercise()}
          >
            +Add Exercise
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

// スタイル
const thStyle: React.CSSProperties = {
  border: "1px solid #000",
  padding: "8px",
  textAlign: "center",
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #000",
  padding: "8px",
  textAlign: "center",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  outline: "none",
  textAlign: "center",
};

export default NotePage;

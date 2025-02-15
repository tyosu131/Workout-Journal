// frontend/features/notes/components/note-page.tsx

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Text,
  Spinner,
  Center,
  Button,
  useBreakpointValue,
  IconButton,
} from "@chakra-ui/react";
import { HamburgerIcon } from "@chakra-ui/icons";
import useSWR from "swr";
import Header from "./header";
import DateInput from "./date-input";
import NoteInput from "./note-input";
import { NoteData } from "../../../types/types";
import { fetchNotesAPI, saveNoteAPI } from "../api";

/**
 * ポイント:
 * - ホバー時だけ '...' アイコンを表示
 * - アイコンは少し左に寄せる (left="-8px" など) → 数字が見やすい
 * - "Exercise:" や行全体は動かさず (padding-left=24px はそのまま)
 * - メニュー外クリックで閉じる, PC幅75%, border-collapse, etc.
 */
const NotePage: React.FC = () => {
  const router = useRouter();
  const { date } = router.query;

  // PC => 75%, モバイル => 100%
  const containerWidth = useBreakpointValue({ base: "100%", lg: "75%" });

  const [noteData, setNoteData] = useState<NoteData | null>(null);

  // 行(#列)ホバー状態
  const [hoveredRow, setHoveredRow] = useState<{
    exIndex: number;
    setIndex: number;
  } | null>(null);

  // 行(#列)メニューオープン
  const [openRowMenu, setOpenRowMenu] = useState<{
    exIndex: number;
    setIndex: number;
  } | null>(null);

  // Exercise枠ホバー状態
  const [hoveredExercise, setHoveredExercise] = useState<number | null>(null);

  // Exerciseメニューオープン
  const [openExerciseMenu, setOpenExerciseMenu] = useState<number | null>(null);

  // 参照 (メニュー外クリックで閉じる)
  const exerciseMenuRef = useRef<HTMLDivElement | null>(null);
  const rowMenuRef = useRef<HTMLDivElement | null>(null);

  // SWR
  const { data } = useSWR<NoteData[]>(
    date ? String(date) : null,
    (d: string) => fetchNotesAPI(d),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  // データ初期化
  useEffect(() => {
    if (!date) return;
    if (data && data.length > 0) {
      setNoteData(data[0]);
    } else if (data && data.length === 0) {
      setNoteData({
        date: String(date),
        note: "",
        exercises: [
          {
            exercise: "",
            sets: [{ weight: "", reps: "", rest: "" }],
          },
        ],
      });
    }
  }, [date, data]);

  // メニュー外クリックで閉じる
  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      // exercise menu
      if (openExerciseMenu !== null && exerciseMenuRef.current) {
        if (!exerciseMenuRef.current.contains(e.target as Node)) {
          setOpenExerciseMenu(null);
        }
      }
      // row menu
      if (openRowMenu !== null && rowMenuRef.current) {
        if (!rowMenuRef.current.contains(e.target as Node)) {
          setOpenRowMenu(null);
        }
      }
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [openExerciseMenu, openRowMenu]);

  if (!noteData) {
    return (
      <Center height="100vh">
        <Spinner size="xl" />
        <Text ml={4}>Loading...</Text>
      </Center>
    );
  }

  // ====== 自動保存 ======
  const autoSave = async (updatedData: NoteData) => {
    try {
      await saveNoteAPI(updatedData);
    } catch (error) {
      console.error("Failed to save note", error);
    }
  };

  // ====== 入力ハンドラ ======
  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newData = { ...noteData, note: e.target.value };
    setNoteData(newData);
    autoSave(newData);
  };
  const handleDateChange = (newDate: string) => {
    router.push(`/note/${newDate}`);
  };
  const handleExerciseChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    exIndex: number
  ) => {
    if (!noteData) return;
    const newExercises = [...noteData.exercises];
    newExercises[exIndex].exercise = e.target.value;
    const newData = { ...noteData, exercises: newExercises };
    setNoteData(newData);
    autoSave(newData);
  };
  const handleSetChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    exIndex: number,
    setIndex: number,
    field: "weight" | "reps" | "rest"
  ) => {
    if (!noteData) return;
    const newExercises = [...noteData.exercises];
    newExercises[exIndex].sets[setIndex][field] = e.target.value;
    const updated = { ...noteData, exercises: newExercises };
    setNoteData(updated);
    autoSave(updated);
  };

  // ====== +Add ======
  const handleAddSet = (exIndex: number) => {
    if (!noteData) return;
    const newNote = { ...noteData };
    newNote.exercises[exIndex].sets.push({ weight: "", reps: "", rest: "" });
    setNoteData(newNote);
    autoSave(newNote);
  };
  const handleAddExercise = () => {
    if (!noteData) return;
    const newNote = { ...noteData };
    newNote.exercises.push({
      exercise: "",
      sets: [{ weight: "", reps: "", rest: "" }],
    });
    setNoteData(newNote);
    autoSave(newNote);
  };

  // ====== 削除 ======
  const handleDeleteRow = (exIndex: number, setIndex: number) => {
    if (!noteData) return;
    const newNote = { ...noteData };
    newNote.exercises[exIndex].sets.splice(setIndex, 1);
    setNoteData(newNote);
    autoSave(newNote);
    setOpenRowMenu(null);
  };
  const handleDeleteExercise = (exIndex: number) => {
    if (!noteData) return;
    const newNote = { ...noteData };
    newNote.exercises.splice(exIndex, 1);
    setNoteData(newNote);
    autoSave(newNote);
    setOpenExerciseMenu(null);
  };

  return (
    <Box p={4}>
      <Header />

      <Text fontSize="2xl" mb={4} textAlign="center">
        Note
      </Text>

      {/* Date & Note */}
      <Box width={containerWidth} margin="0 auto">
        <DateInput date={noteData.date} onDateChange={handleDateChange} />
        <NoteInput note={noteData.note} onNoteChange={handleNoteChange} />
      </Box>

      {/* Exercises */}
      <Box mt={6} width={containerWidth} margin="0 auto">
        {noteData.exercises.map((exercise, eIndex) => (
          <Box
            key={eIndex}
            border="1px solid #000"
            borderRadius="4px"
            p={3}
            mb={4}
          >
            {/* "Exercise:" 行 */}
            <Box
              position="relative"
              pl="24px"
              onMouseEnter={() => setHoveredExercise(eIndex)}
              onMouseLeave={() => setHoveredExercise(null)}
            >
              <Box display="flex" alignItems="center" mb={2}>
                <Box fontWeight="bold" mr={2}>
                  Exercise:
                </Box>
                <input
                  style={{ width: "100%", border: "none", outline: "none" }}
                  value={exercise.exercise}
                  onChange={(ev) => handleExerciseChange(ev, eIndex)}
                />
              </Box>

              {/* アイコン: hoveredExercise===eIndex && openExerciseMenu!== eIndex */}
              {hoveredExercise === eIndex && openExerciseMenu !== eIndex && (
                <Box
                  position="absolute"
                  // ★ leftを-8px程度にする → 少しだけ左へ寄せる
                  left="-8px"
                  top="50%"
                  transform="translateY(-50%)"
                >
                  <IconButton
                    aria-label="Options"
                    icon={<HamburgerIcon />}
                    size="xs"
                    variant="ghost"
                    onClick={() => setOpenExerciseMenu(eIndex)}
                  />
                </Box>
              )}

              {/* メニュー: openExerciseMenu=== eIndex */}
              {openExerciseMenu === eIndex && (
                <Box
                  position="absolute"
                  left="-4px"
                  top="50%"
                  transform="translate(-100%, -50%)"
                  bg="white"
                  border="1px solid #ccc"
                  borderRadius="4px"
                  p={2}
                  zIndex={999}
                  ref={exerciseMenuRef}
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    _hover={{ bg: "red.100" }}
                    onClick={() => handleDeleteExercise(eIndex)}
                  >
                    Delete exercise
                  </Button>
                </Box>
              )}
            </Box>

            {/* テーブル */}
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
                </tr>
              </thead>
              <tbody>
                {exercise.sets.map((set, sIndex) => (
                  <tr
                    key={sIndex}
                    style={{ position: "relative" }}
                    onMouseEnter={() =>
                      setHoveredRow({ exIndex: eIndex, setIndex: sIndex })
                    }
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td style={tdStyle}>
                      {/* アイコン: hoveredRow===..., openRowMenu!==... */}
                      {hoveredRow &&
                        hoveredRow.exIndex === eIndex &&
                        hoveredRow.setIndex === sIndex &&
                        !(openRowMenu &&
                          openRowMenu.exIndex === eIndex &&
                          openRowMenu.setIndex === sIndex) && (
                          <Box
                            position="absolute"
                            // ★ leftを-8px程度にする → 少しだけ左へ寄せる
                            left="-8px"
                            top="50%"
                            transform="translateY(-50%)"
                          >
                            <IconButton
                              aria-label="Options"
                              icon={<HamburgerIcon />}
                              size="xs"
                              variant="ghost"
                              onClick={() =>
                                setOpenRowMenu({ exIndex: eIndex, setIndex: sIndex })
                              }
                            />
                          </Box>
                        )}

                      {/* メニュー: openRowMenu===... */}
                      {openRowMenu &&
                        openRowMenu.exIndex === eIndex &&
                        openRowMenu.setIndex === sIndex && (
                          <Box
                            position="absolute"
                            left="-4px"
                            top="50%"
                            transform="translate(-100%, -50%)"
                            bg="white"
                            border="1px solid #ccc"
                            borderRadius="4px"
                            p={2}
                            zIndex={999}
                            ref={rowMenuRef}
                          >
                            <Button
                              size="sm"
                              variant="ghost"
                              _hover={{ bg: "red.100" }}
                              onClick={() => handleDeleteRow(eIndex, sIndex)}
                            >
                              Delete
                            </Button>
                          </Box>
                        )}

                      {sIndex + 1}
                    </td>
                    {/* Weight */}
                    <td style={tdStyle}>
                      <input
                        style={inputStyle}
                        value={set.weight}
                        onChange={(ev) =>
                          handleSetChange(ev, eIndex, sIndex, "weight")
                        }
                      />
                    </td>
                    {/* Reps */}
                    <td style={tdStyle}>
                      <input
                        style={inputStyle}
                        value={set.reps}
                        onChange={(ev) =>
                          handleSetChange(ev, eIndex, sIndex, "reps")
                        }
                      />
                    </td>
                    {/* Rest */}
                    <td style={tdStyle}>
                      <input
                        style={inputStyle}
                        value={set.rest}
                        onChange={(ev) =>
                          handleSetChange(ev, eIndex, sIndex, "rest")
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "8px" }}>
                    <Button size="sm" onClick={() => handleAddSet(eIndex)}>
                      +Add set
                    </Button>
                  </td>
                </tr>
              </tfoot>
            </Box>
          </Box>
        ))}

        {/* +Add exercise */}
        <Box textAlign="center">
          <Button onClick={handleAddExercise}>+Add Exercise</Button>
        </Box>
      </Box>
    </Box>
  );
};

export default NotePage;

/** テーブル見出し/セル */
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

/** 入力欄 */
const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  outline: "none",
  textAlign: "center",
};

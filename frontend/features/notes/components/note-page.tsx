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
import { fetchNotesAPI } from "../api";
import useNoteHandlers from "../hooks/useNoteHandlers";

// handleDocClick を useEffect の外に定義
function handleDocClick(
  e: MouseEvent,
  openExerciseMenu: number | null,
  exerciseMenuRef: React.RefObject<HTMLDivElement>,
  setOpenExerciseMenu: React.Dispatch<React.SetStateAction<number | null>>,
  openRowMenu: { exIndex: number; setIndex: number } | null,
  rowMenuRef: React.RefObject<HTMLDivElement>,
  setOpenRowMenu: React.Dispatch<React.SetStateAction<{ exIndex: number; setIndex: number } | null>>
) {
  if (openExerciseMenu !== null && exerciseMenuRef.current) {
    if (!exerciseMenuRef.current.contains(e.target as Node)) {
      setOpenExerciseMenu(null);
    }
  }
  if (openRowMenu !== null && rowMenuRef.current) {
    if (!rowMenuRef.current.contains(e.target as Node)) {
      setOpenRowMenu(null);
    }
  }
}

const NotePage: React.FC = () => {
  const router = useRouter();
  const { date } = router.query;
  const containerWidth = useBreakpointValue({ base: "100%", lg: "75%" });

  const [noteData, setNoteData] = useState<NoteData | null>(null);

  // 「#」セルのホバー状態
  const [hoveredRow, setHoveredRow] = useState<{ exIndex: number; setIndex: number } | null>(null);

  // Exercise枠のホバー状態
  const [hoveredExercise, setHoveredExercise] = useState<number | null>(null);

  // メニューオープン状態
  const [openRowMenu, setOpenRowMenu] = useState<{ exIndex: number; setIndex: number } | null>(null);
  const [openExerciseMenu, setOpenExerciseMenu] = useState<number | null>(null);

  const exerciseMenuRef = useRef<HTMLDivElement | null>(null);
  const rowMenuRef = useRef<HTMLDivElement | null>(null);

  // SWR でノートを取得
  const { data } = useSWR<NoteData[]>(
    date ? String(date) : null,
    (d: string) => fetchNotesAPI(d),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  // ハンドラ類（自動保存, 入力変更, 削除等）
  const {
    handleInputChange,
    handleNoteChange,
    handleExerciseChange,
    handleDateChange,
    handleAddSet,
    handleAddExercise,
    handleDeleteRow,
    handleDeleteExercise,
  } = useNoteHandlers(noteData, setNoteData, setOpenRowMenu, setOpenExerciseMenu);

  // ノート初期化
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
    function onDocClick(e: MouseEvent) {
      handleDocClick(
        e,
        openExerciseMenu,
        exerciseMenuRef,
        setOpenExerciseMenu,
        openRowMenu,
        rowMenuRef,
        setOpenRowMenu
      );
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openExerciseMenu, openRowMenu]);

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

      {/* Date & Note */}
      <Box width={containerWidth} margin="0 auto">
        <DateInput date={noteData.date} onDateChange={handleDateChange} />
        <NoteInput note={noteData.note} onNoteChange={handleNoteChange} />
      </Box>

      {/* Exercises */}
      <Box mt={6} width={containerWidth} margin="0 auto">
        {noteData.exercises.map((exercise, eIndex) => (
          <Box key={eIndex} border="1px solid #000" borderRadius="4px" p={3} mb={4}>
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

              {/* Exercise削除アイコン */}
              {hoveredExercise === eIndex && openExerciseMenu !== eIndex && (
                <Box position="absolute" left="-8px" top="50%" transform="translateY(-50%)">
                  <IconButton
                    aria-label="Options"
                    icon={<HamburgerIcon />}
                    size="xs"
                    variant="ghost"
                    onClick={() => setOpenExerciseMenu(eIndex)}
                  />
                </Box>
              )}
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

            {/* セットのテーブル */}
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
                  <tr key={sIndex}>
                    {/* # のセルだけホバー判定を行う */}
                    <td
                      style={{ ...tdStyle, position: "relative" }}
                      onMouseEnter={() => setHoveredRow({ exIndex: eIndex, setIndex: sIndex })}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      {/* ホバー時だけアイコン */}
                      {hoveredRow &&
                        hoveredRow.exIndex === eIndex &&
                        hoveredRow.setIndex === sIndex &&
                        !(openRowMenu &&
                          openRowMenu.exIndex === eIndex &&
                          openRowMenu.setIndex === sIndex) && (
                          <Box
                            position="absolute"
                            left="-8px"
                            top="50%"
                            transform="translateY(-50%)"
                          >
                            <IconButton
                              aria-label="Options"
                              icon={<HamburgerIcon />}
                              size="xs"
                              variant="ghost"
                              onClick={() => setOpenRowMenu({ exIndex: eIndex, setIndex: sIndex })}
                            />
                          </Box>
                        )}
                      {/* メニュー */}
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
                        onChange={(ev) => handleInputChange(ev, eIndex, sIndex, "weight")}
                      />
                    </td>
                    {/* Reps */}
                    <td style={tdStyle}>
                      <input
                        style={inputStyle}
                        value={set.reps}
                        onChange={(ev) => handleInputChange(ev, eIndex, sIndex, "reps")}
                      />
                    </td>
                    {/* Rest */}
                    <td style={tdStyle}>
                      <input
                        style={inputStyle}
                        value={set.rest}
                        onChange={(ev) => handleInputChange(ev, eIndex, sIndex, "rest")}
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
